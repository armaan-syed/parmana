from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.kyc import AuditLog
from app.schemas.kyc import AuditEventResponse

router = APIRouter(prefix="/audit", tags=["Audit Trail"])


@router.get("/logs", response_model=List[AuditEventResponse])
def get_audit_logs(db: Session = Depends(get_db)):
    """
    Returns complete chronological audit history of all changes and manual actions.
    """
    logs = db.query(AuditLog).order_by(AuditLog.id.desc()).all()
    return [
        AuditEventResponse(
            id=log.audit_id,
            requestId=log.request_id,
            customerId=log.customer_id,
            customer=log.customer_name,
            admin=log.admin_name,
            action=log.action,
            field=log.field,
            previous=log.previous_value,
            next=log.next_value,
            reason=log.reason,
            timestamp=log.timestamp,
        )
        for log in logs
    ]
