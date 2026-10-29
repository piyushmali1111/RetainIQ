from app.db.models import AgentPreference

def get_preferences(db):
    value = db.get(AgentPreference, 1)
    if value is None:
        value = AgentPreference(id=1, ticket_monitoring=True, automated_offers=True)
        db.add(value)
        db.commit()
        db.refresh(value)
    return value
