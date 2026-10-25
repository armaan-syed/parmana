from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.models.kyc import User, Customer, KycRequest, AuditLog


def seed_initial_data(db: Session):
    """
    Populates initial customers, demo requests, and audit logs into PostgreSQL if empty.
    Matches the exact dataset expected by the frontend.
    """
    if db.query(Customer).first() is not None:
        return

    # Seed Users
    users_data = [
        User(user_id="CUS-1042", email="anaya.rao@example.test", full_name="Anaya Rao", role="customer"),
        User(user_id="CUS-1038", email="kabir.mehta@example.test", full_name="Kabir Mehta", role="customer"),
        User(user_id="CUS-1031", email="meera.iyer@example.test", full_name="Meera Iyer", role="customer"),
        User(user_id="CUS-1024", email="rohan.das@example.test", full_name="Rohan Das", role="customer"),
        User(user_id="CUS-1016", email="tara.shah@example.test", full_name="Tara Shah", role="customer"),
        User(user_id="ADM-001", email="admin@pramana.test", full_name="Nisha Verma", role="admin"),
    ]
    db.add_all(users_data)
    db.commit()

    # Seed Customers
    customers_data = [
        Customer(
            customer_id="CUS-1042",
            name="Anaya Rao",
            email="anaya.rao@example.test",
            dob="14 Mar 1994",
            gender="Female",
            address="18 Lake View Rd, Pune",
            phone="+91 98201 12345",
            kyc_status="UNDER_REVIEW",
        ),
        Customer(
            customer_id="CUS-1038",
            name="Kabir Mehta",
            email="kabir.mehta@example.test",
            dob="23 Jul 1988",
            gender="Male",
            address="44 Palm Grove, Mumbai",
            phone="+91 98202 23456",
            kyc_status="UNDER_REVIEW",
        ),
        Customer(
            customer_id="CUS-1031",
            name="Meera Iyer",
            email="meera.iyer@example.test",
            dob="02 Dec 1990",
            gender="Female",
            address="9 Park Street, Chennai",
            phone="+91 98203 34567",
            kyc_status="SUBMITTED",
        ),
        Customer(
            customer_id="CUS-1024",
            name="Rohan Das",
            email="rohan.das@example.test",
            dob="17 Jan 1992",
            gender="Male",
            address="71 Green Avenue, Delhi",
            phone="+91 98204 45678",
            kyc_status="VERIFIED",
        ),
        Customer(
            customer_id="CUS-1016",
            name="Tara Shah",
            email="tara.shah@example.test",
            dob="31 May 1995",
            gender="Female",
            address="12 Rose Lane, Jaipur",
            phone="+91 98205 56789",
            kyc_status="REJECTED",
        ),
    ]
    db.add_all(customers_data)
    db.commit()

    # Seed Requests
    requests_data = [
        KycRequest(
            request_id="KYC-2841",
            customer_id="CUS-1042",
            status="UNDER_REVIEW",
            submitted_at="12 Oct 2026",
            updated_at="12 Oct 2026",
            documents_list=["Aadhaar", "Voter ID"],
            fields_data=[
                {"label": "Full name", "existing": "Anaya Rao", "extracted": "Anaya Rao", "result": "MATCH"},
                {"label": "Date of birth", "existing": "14 Mar 1994", "extracted": "14 Mar 1994", "result": "MATCH"},
                {"label": "Address", "existing": "18 Lake View Rd, Pune", "extracted": "18 Lakeview Road, Pune", "result": "UNCERTAIN"},
                {"label": "Document number", "existing": "XXXX XXXX 4821", "extracted": "XXXX XXXX 4821", "result": "MATCH"},
            ],
        ),
        KycRequest(
            request_id="KYC-2838",
            customer_id="CUS-1038",
            status="UNDER_REVIEW",
            submitted_at="11 Oct 2026",
            updated_at="12 Oct 2026",
            documents_list=["Aadhaar", "Voter ID"],
            fields_data=[
                {"label": "Full name", "existing": "Kabir Mehta", "extracted": "Kabir R. Mehta", "result": "MISMATCH"},
                {"label": "Date of birth", "existing": "23 Jul 1988", "extracted": "23 Jul 1988", "result": "MATCH"},
                {"label": "Address", "existing": "44 Palm Grove, Mumbai", "extracted": "44 Palm Grove, Mumbai", "result": "MATCH"},
                {"label": "Document number", "existing": "XXXX XXXX 7305", "extracted": "XXXX XXXX 7305", "result": "MATCH"},
            ],
        ),
        KycRequest(
            request_id="KYC-2834",
            customer_id="CUS-1031",
            status="SUBMITTED",
            submitted_at="10 Oct 2026",
            updated_at="10 Oct 2026",
            documents_list=["Aadhaar", "Voter ID"],
            fields_data=[
                {"label": "Full name", "existing": "Meera Iyer", "extracted": "Meera Iyer", "result": "MATCH"},
                {"label": "Date of birth", "existing": "02 Dec 1990", "extracted": "—", "result": "UNCERTAIN"},
                {"label": "Address", "existing": "9 Park Street, Chennai", "extracted": "9 Park St, Chennai", "result": "UNCERTAIN"},
                {"label": "Document number", "existing": "XXXX XXXX 1954", "extracted": "XXXX XXXX 1954", "result": "MATCH"},
            ],
        ),
        KycRequest(
            request_id="KYC-2827",
            customer_id="CUS-1024",
            status="VERIFIED",
            submitted_at="08 Oct 2026",
            updated_at="09 Oct 2026",
            documents_list=["Aadhaar", "Voter ID"],
            fields_data=[
                {"label": "Full name", "existing": "Rohan Das", "extracted": "Rohan Das", "result": "MATCH"},
                {"label": "Date of birth", "existing": "17 Jan 1992", "extracted": "17 Jan 1992", "result": "MATCH"},
                {"label": "Address", "existing": "71 Green Avenue, Delhi", "extracted": "71 Green Avenue, Delhi", "result": "MATCH"},
                {"label": "Document number", "existing": "XXXX XXXX 6410", "extracted": "XXXX XXXX 6410", "result": "MATCH"},
            ],
        ),
        KycRequest(
            request_id="KYC-2819",
            customer_id="CUS-1016",
            status="REJECTED",
            submitted_at="06 Oct 2026",
            updated_at="07 Oct 2026",
            documents_list=["Aadhaar", "Voter ID"],
            reason="The submitted address proof was not legible.",
            fields_data=[
                {"label": "Full name", "existing": "Tara Shah", "extracted": "Tara Shah", "result": "MATCH"},
                {"label": "Date of birth", "existing": "31 May 1995", "extracted": "31 May 1995", "result": "MATCH"},
                {"label": "Address", "existing": "12 Rose Lane, Jaipur", "extracted": "—", "result": "UNCERTAIN"},
                {"label": "Document number", "existing": "XXXX XXXX 8022", "extracted": "XXXX XXXX 8022", "result": "MATCH"},
            ],
        ),
    ]
    db.add_all(requests_data)
    db.commit()

    # Seed Audit
    audit_data = [
        AuditLog(
            audit_id="AUD-0481",
            request_id="KYC-2827",
            customer_id="CUS-1024",
            customer_name="Rohan Das",
            admin_name="Nisha Verma",
            action="Request verified",
            field="KYC status",
            previous_value="Under review",
            next_value="Verified",
            reason="All required fields matched.",
            timestamp="09 Oct 2026 · 14:32",
        ),
        AuditLog(
            audit_id="AUD-0478",
            request_id="KYC-2819",
            customer_id="CUS-1016",
            customer_name="Tara Shah",
            admin_name="Nisha Verma",
            action="Request rejected",
            field="KYC status",
            previous_value="Under review",
            next_value="Rejected",
            reason="The submitted address proof was not legible.",
            timestamp="07 Oct 2026 · 11:08",
        ),
    ]
    db.add_all(audit_data)
    db.commit()
