import re
import math
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
from app.services.rag_service import query_faq_context
from app.config import settings

BANNED_COMMITMENT_PHRASES = [
    "has been issued",
    "have issued",
    "refunded",
    "credit has been",
    "we are reshipping",
    "will be reshipped",
    "% off",
    "discount",
]

_sentiment_analyzer = None

def _get_analyzer():
    global _sentiment_analyzer
    if _sentiment_analyzer is None:
        _sentiment_analyzer = SentimentIntensityAnalyzer()
        _sentiment_analyzer.lexicon.update({
            "crushed": -2.5, "damaged": -2.4, "broken": -2.4,
            "missing": -2.0, "refund": -1.2, "late": -1.2,
            "unacceptable": -3.0, "scam": -3.5,
        })
    return _sentiment_analyzer

def _detect_sentiment(text: str) -> str:
    """Returns 'happy', 'neutral', or 'angry' based on VADER compound score."""
    compound = _get_analyzer().polarity_scores(text or "")["compound"]
    if compound >= 0.35:
        return "happy"
    elif compound <= -0.35:
        return "angry"
    return "neutral"

def contains_banned_commitment(text: str) -> bool:
    lowered = text.lower()
    return any(phrase in lowered for phrase in BANNED_COMMITMENT_PHRASES)

def safe_fallback_reply(customer_name: str) -> str:
    return (
        f"Hi {customer_name}, thank you for reaching out. We've noted your message "
        f"and our team will follow up shortly if any action is needed."
    )

def run_support_agent(ticket_text: str, customer_name: str) -> str:
    """
    RAG-augmented Support Agent drafting customer replies.
    Section 7:
    - Happy tickets  → warm thank-you / acknowledgment reply.
    - Neutral tickets → helpful acknowledgment.
    - Angry tickets   → empathetic apology + escalation (no refund/discount promises).
    """
    faq_context = query_faq_context(ticket_text)
    sentiment = _detect_sentiment(ticket_text)
    api_key = settings.GEMINI_API_KEY

    # Build a sentiment-aware system prompt for the LLM path
    if sentiment == "happy":
        tone_instruction = (
            "The customer is happy and leaving a POSITIVE review. "
            "DO NOT apologize. Instead, warmly thank the customer, celebrate their positive experience, "
            "and invite them to shop again. Keep the tone upbeat and genuine."
        )
    elif sentiment == "angry":
        tone_instruction = (
            "The customer is unhappy or complaining. "
            "Apologize sincerely, acknowledge the specific problem, "
            "and inform them that their case has been logged and escalated for review. "
            "Say our team will confirm next steps shortly. "
            "Do NOT promise a refund, replacement, reshipment, credit, coupon, or discount."
        )
    else:
        tone_instruction = (
            "The customer has a neutral inquiry or mixed message. "
            "Acknowledge their message helpfully, answer from the knowledge base if relevant, "
            "and let them know our team is available to assist further."
        )

    system_instruction = (
        f"You are an empathetic, professional e-commerce customer support representative for ChurnGuardAI.\n"
        f"Customer Name: {customer_name}\n"
        f"Ticket Message: \"{ticket_text}\"\n\n"
        f"Knowledge Base Context:\n{faq_context}\n\n"
        f"Tone & Behavior: {tone_instruction}\n\n"
        f"HARD RULES (all sentiments):\n"
        f"1. Never state or imply that a refund, store credit, discount, coupon, replacement, "
        f"or reshipment has been issued, granted, or completed.\n"
        f"2. Keep the response concise (2-4 sentences), professional, and on-brand.\n"
        f"3. Address the customer by name."
    )

    candidate_reply = None

    if api_key and settings.ENABLE_LIVE_LLM:
        try:
            from google import genai
            import concurrent.futures

            def _call_gemini():
                client = genai.Client(api_key=api_key)
                return client.models.generate_content(
                    model="gemini-3.8-flash",
                    contents=system_instruction
                )

            with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
                future = executor.submit(_call_gemini)
                response = future.result(timeout=4.0)
                if response and response.text:
                    candidate_reply = response.text.strip()
        except Exception:
            candidate_reply = None

    # Deterministic fallback — sentiment-aware
    if not candidate_reply or contains_banned_commitment(candidate_reply):
        lowered = ticket_text.lower()

        if sentiment == "happy":
            # Positive review / compliment
            if any(w in lowered for w in ["great", "excellent", "amazing", "love", "perfect", "fantastic"]):
                candidate_reply = (
                    f"Hi {customer_name}, thank you so much for the wonderful feedback! "
                    f"We're thrilled you loved your experience. We look forward to serving you again soon!"
                )
            elif any(w in lowered for w in ["good", "nice", "happy", "satisfied", "pleased"]):
                candidate_reply = (
                    f"Hi {customer_name}, thank you for your kind words! "
                    f"We're delighted to hear you're happy with your order. "
                    f"We hope to see you again soon!"
                )
            else:
                candidate_reply = (
                    f"Hi {customer_name}, thank you for reaching out and sharing your experience with us! "
                    f"We really appreciate your feedback and hope to continue delighting you."
                )

        elif sentiment == "angry":
            # Complaint / negative
            if any(w in lowered for w in ["damage", "crush", "broken", "defect"]):
                candidate_reply = (
                    f"Hi {customer_name}, we deeply apologize for the damaged item! "
                    f"We have flagged your ticket for urgent inspection, "
                    f"and our team is reviewing this and will confirm next steps shortly."
                )
            elif re.search(r"\b(delay(?:ed)?|pending|late|weeks?)\b", lowered):
                candidate_reply = (
                    f"Dear {customer_name}, we sincerely apologize for the shipping delay. "
                    f"Your delivery concern has been flagged for review, "
                    f"and our team will confirm the next steps shortly."
                )
            elif any(w in lowered for w in ["pause", "cancel", "stop"]):
                candidate_reply = (
                    f"Hello {customer_name}, thank you for contacting us regarding your account. "
                    f"Our support team is reviewing your request and will follow up with full details."
                )
            else:
                candidate_reply = (
                    f"Hi {customer_name}, we're sorry to hear about your experience. "
                    f"We've flagged your case to our team who will review it and follow up with next steps shortly."
                )

        else:
            # Neutral
            candidate_reply = safe_fallback_reply(customer_name)

    # Final hard guardrail — strip any accidental commitment phrases
    if contains_banned_commitment(candidate_reply):
        candidate_reply = safe_fallback_reply(customer_name)

    return candidate_reply
