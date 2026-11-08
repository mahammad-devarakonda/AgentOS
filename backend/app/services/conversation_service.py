import json
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from app.db.connection import get_db_connection
from app.schemas.conversation import (
    AgentTokenStats,
    ConversationAnalyticsItem,
    ConversationAnalyticsResponse,
    ConversationCreate,
    ConversationDetailResponse,
    ConversationListResponse,
    ConversationResponse,
    ConversationUpdate,
    MessageCreate,
    MessageResponse,
    TokenUsage,
)


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _parse_json(raw: Any) -> Dict[str, Any]:
    if not raw:
        return {}
    if isinstance(raw, dict):
        return raw
    try:
        return json.loads(raw)
    except Exception:
        return {}


class ConversationService:
    def create_conversation(self, payload: ConversationCreate) -> ConversationResponse:
        conv_id = str(uuid.uuid4())
        now = _utc_now_iso()
        title = (payload.title or "").strip()
        if not title:
            title = f"New {payload.agent_type.replace('_', ' ').title()} Chat"

        meta_json = json.dumps(payload.metadata or {})
        conn = get_db_connection()
        try:
            with conn:
                conn.execute(
                    """
                    INSERT INTO conversations (id, title, agent_type, metadata, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?);
                    """,
                    (conv_id, title, payload.agent_type, meta_json, now, now),
                )
            return ConversationResponse(
                id=conv_id,
                title=title,
                agent_type=payload.agent_type,
                metadata=payload.metadata or {},
                created_at=now,
                updated_at=now,
                message_count=0,
                last_message=None,
            )
        finally:
            conn.close()

    def list_conversations(
        self,
        agent_type: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> ConversationListResponse:
        conn = get_db_connection()
        try:
            params: List[Any] = []
            where_clauses = []
            if agent_type:
                where_clauses.append("agent_type = ?")
                params.append(agent_type)

            where_str = f"WHERE {' AND '.join(where_clauses)}" if where_clauses else ""

            # Count total
            count_cur = conn.execute(f"SELECT COUNT(*) as cnt FROM conversations {where_str};", params)
            total = count_cur.fetchone()["cnt"]

            # Query items
            query = f"""
                SELECT c.id, c.title, c.agent_type, c.metadata, c.created_at, c.updated_at,
                       (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id) as msg_count
                FROM conversations c
                {where_str}
                ORDER BY c.updated_at DESC
                LIMIT ? OFFSET ?;
            """
            cur = conn.execute(query, params + [limit, offset])
            rows = cur.fetchall()

            items: List[ConversationResponse] = []
            for row in rows:
                conv_id = row["id"]
                # Get last message preview
                last_msg_row = conn.execute(
                    """
                    SELECT id, conversation_id, role, sender_name, content, metadata, created_at
                    FROM messages
                    WHERE conversation_id = ?
                    ORDER BY created_at DESC
                    LIMIT 1;
                    """,
                    (conv_id,),
                ).fetchone()

                last_msg = None
                if last_msg_row:
                    last_msg = MessageResponse(
                        id=last_msg_row["id"],
                        conversation_id=last_msg_row["conversation_id"],
                        role=last_msg_row["role"],
                        sender_name=last_msg_row["sender_name"],
                        content=last_msg_row["content"],
                        metadata=_parse_json(last_msg_row["metadata"]),
                        created_at=last_msg_row["created_at"],
                    )

                items.append(
                    ConversationResponse(
                        id=row["id"],
                        title=row["title"],
                        agent_type=row["agent_type"],
                        metadata=_parse_json(row["metadata"]),
                        created_at=row["created_at"],
                        updated_at=row["updated_at"],
                        message_count=row["msg_count"],
                        last_message=last_msg,
                    )
                )

            return ConversationListResponse(total=total, items=items)
        finally:
            conn.close()

    def get_conversation(self, conversation_id: str) -> Optional[ConversationDetailResponse]:
        conn = get_db_connection()
        try:
            cur = conn.execute(
                """
                SELECT id, title, agent_type, metadata, created_at, updated_at
                FROM conversations
                WHERE id = ?;
                """,
                (conversation_id,),
            )
            row = cur.fetchone()
            if not row:
                return None

            msg_cur = conn.execute(
                """
                SELECT id, conversation_id, role, sender_name, content, metadata, created_at
                FROM messages
                WHERE conversation_id = ?
                ORDER BY created_at ASC;
                """,
                (conversation_id,),
            )
            msg_rows = msg_cur.fetchall()

            messages = [
                MessageResponse(
                    id=m["id"],
                    conversation_id=m["conversation_id"],
                    role=m["role"],
                    sender_name=m["sender_name"],
                    content=m["content"],
                    metadata=_parse_json(m["metadata"]),
                    created_at=m["created_at"],
                )
                for m in msg_rows
            ]

            return ConversationDetailResponse(
                id=row["id"],
                title=row["title"],
                agent_type=row["agent_type"],
                metadata=_parse_json(row["metadata"]),
                created_at=row["created_at"],
                updated_at=row["updated_at"],
                messages=messages,
            )
        finally:
            conn.close()

    def update_conversation(
        self,
        conversation_id: str,
        payload: ConversationUpdate,
    ) -> Optional[ConversationResponse]:
        conn = get_db_connection()
        try:
            # Check existing
            cur = conn.execute("SELECT * FROM conversations WHERE id = ?;", (conversation_id,))
            row = cur.fetchone()
            if not row:
                return None

            now = _utc_now_iso()
            new_title = payload.title.strip() if payload.title is not None else row["title"]
            new_metadata = (
                payload.metadata if payload.metadata is not None else _parse_json(row["metadata"])
            )

            with conn:
                conn.execute(
                    """
                    UPDATE conversations
                    SET title = ?, metadata = ?, updated_at = ?
                    WHERE id = ?;
                    """,
                    (new_title, json.dumps(new_metadata), now, conversation_id),
                )

            msg_count_cur = conn.execute(
                "SELECT COUNT(*) as cnt FROM messages WHERE conversation_id = ?;", (conversation_id,)
            )
            cnt = msg_count_cur.fetchone()["cnt"]

            return ConversationResponse(
                id=conversation_id,
                title=new_title,
                agent_type=row["agent_type"],
                metadata=new_metadata,
                created_at=row["created_at"],
                updated_at=now,
                message_count=cnt,
                last_message=None,
            )
        finally:
            conn.close()

    def delete_conversation(self, conversation_id: str) -> bool:
        conn = get_db_connection()
        try:
            with conn:
                cur = conn.execute("DELETE FROM conversations WHERE id = ?;", (conversation_id,))
                return cur.rowcount > 0
        finally:
            conn.close()

    def add_message(self, conversation_id: str, payload: MessageCreate) -> Optional[MessageResponse]:
        conn = get_db_connection()
        try:
            # Check conversation exists
            conv_cur = conn.execute("SELECT id, title FROM conversations WHERE id = ?;", (conversation_id,))
            conv = conv_cur.fetchone()
            if not conv:
                return None

            msg_id = str(uuid.uuid4())
            now = _utc_now_iso()
            meta_json = json.dumps(payload.metadata or {})
            role_val = payload.role.value if hasattr(payload.role, "value") else str(payload.role)

            with conn:
                conn.execute(
                    """
                    INSERT INTO messages (id, conversation_id, role, sender_name, content, metadata, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?);
                    """,
                    (
                        msg_id,
                        conversation_id,
                        role_val,
                        payload.sender_name,
                        payload.content,
                        meta_json,
                        now,
                    ),
                )

                # If conversation still has default placeholder title and this is first user message, update title
                current_title = conv["title"]
                if current_title.startswith("New ") and role_val == "user":
                    clean_content = " ".join(payload.content.split())
                    smart_title = clean_content[:50] + ("..." if len(clean_content) > 50 else "")
                    conn.execute(
                        "UPDATE conversations SET title = ?, updated_at = ? WHERE id = ?;",
                        (smart_title, now, conversation_id),
                    )
                else:
                    conn.execute(
                        "UPDATE conversations SET updated_at = ? WHERE id = ?;",
                        (now, conversation_id),
                    )

            return MessageResponse(
                id=msg_id,
                conversation_id=conversation_id,
                role=role_val,
                sender_name=payload.sender_name,
                content=payload.content,
                metadata=payload.metadata or {},
                created_at=now,
            )
        finally:
            conn.close()

    def get_messages(self, conversation_id: str, limit: int = 100, offset: int = 0) -> List[MessageResponse]:
        conn = get_db_connection()
        try:
            cur = conn.execute(
                """
                SELECT id, conversation_id, role, sender_name, content, metadata, created_at
                FROM messages
                WHERE conversation_id = ?
                ORDER BY created_at ASC
                LIMIT ? OFFSET ?;
                """,
                (conversation_id, limit, offset),
            )
            rows = cur.fetchall()
            return [
                MessageResponse(
                    id=m["id"],
                    conversation_id=m["conversation_id"],
                    role=m["role"],
                    sender_name=m["sender_name"],
                    content=m["content"],
                    metadata=_parse_json(m["metadata"]),
                    created_at=m["created_at"],
                )
                for m in rows
            ]
        finally:
            conn.close()

    def delete_message(self, conversation_id: str, message_id: str) -> bool:
        conn = get_db_connection()
        try:
            with conn:
                cur = conn.execute(
                    "DELETE FROM messages WHERE id = ? AND conversation_id = ?;",
                    (message_id, conversation_id),
                )
                return cur.rowcount > 0
        finally:
            conn.close()

    def clear_messages(self, conversation_id: str) -> bool:
        conn = get_db_connection()
        try:
            with conn:
                cur = conn.execute("DELETE FROM messages WHERE conversation_id = ?;", (conversation_id,))
                return cur.rowcount >= 0
        finally:
            conn.close()

    @staticmethod
    def _extract_tokens_from_dict(meta: Dict[str, Any]) -> Optional[Dict[str, int]]:
        if not isinstance(meta, dict):
            return None
        for key in ("tokens", "token_usage", "usage"):
            if key in meta and isinstance(meta[key], dict):
                sub = meta[key]
                p = int(sub.get("prompt_tokens", 0) or sub.get("input_tokens", 0) or 0)
                c = int(sub.get("completion_tokens", 0) or sub.get("output_tokens", 0) or 0)
                t = int(sub.get("total_tokens", 0) or (p + c))
                return {"prompt_tokens": p, "completion_tokens": c, "total_tokens": t}

        if "prompt_tokens" in meta or "completion_tokens" in meta or "total_tokens" in meta:
            p = int(meta.get("prompt_tokens", 0) or meta.get("input_tokens", 0) or 0)
            c = int(meta.get("completion_tokens", 0) or meta.get("output_tokens", 0) or 0)
            t = int(meta.get("total_tokens", 0) or (p + c))
            return {"prompt_tokens": p, "completion_tokens": c, "total_tokens": t}
        return None

    @staticmethod
    def _estimate_tokens(text: str) -> int:
        if not text:
            return 0
        return max(1, (len(text.strip()) + 3) // 4)

    def get_analytics(
        self,
        agent_types: Optional[List[str]] = None,
        limit: int = 200,
        offset: int = 0,
        include_messages: bool = True,
    ) -> ConversationAnalyticsResponse:
        """
        Retrieves all conversations for specific agent domains (defaults to resume_analyzer and job_search),
        calculates prompt, completion, and total tokens for each conversation, and aggregates stats.
        """
        # Safeguard if called directly in python where Query objects might be passed as defaults
        limit_val = int(limit.default if hasattr(limit, "default") else limit)
        offset_val = int(offset.default if hasattr(offset, "default") else offset)
        inc_msgs = bool(include_messages.default if hasattr(include_messages, "default") else include_messages)

        raw_agents = agent_types.default if hasattr(agent_types, "default") else agent_types
        target_agents = list(raw_agents) if raw_agents else ["resume_analyzer", "job_search"]

        conn = get_db_connection()
        try:
            placeholders = ",".join("?" for _ in target_agents)
            cur = conn.execute(
                f"""
                SELECT id, title, agent_type, metadata, created_at, updated_at
                FROM conversations
                WHERE agent_type IN ({placeholders})
                ORDER BY updated_at DESC
                LIMIT ? OFFSET ?;
                """,
                target_agents + [limit_val, offset_val],
            )

            rows = cur.fetchall()

            analytics_items: List[ConversationAnalyticsItem] = []
            breakdown: Dict[str, AgentTokenStats] = {}
            for agent in target_agents:
                breakdown[agent] = AgentTokenStats(
                    agent_type=agent,
                    conversation_count=0,
                    prompt_tokens=0,
                    completion_tokens=0,
                    total_tokens=0,
                )

            global_prompt_tokens = 0
            global_completion_tokens = 0
            global_total_tokens = 0

            for row in rows:
                conv_id = row["id"]
                conv_type = row["agent_type"]
                conv_meta = _parse_json(row["metadata"])

                msg_cur = conn.execute(
                    """
                    SELECT id, conversation_id, role, sender_name, content, metadata, created_at
                    FROM messages
                    WHERE conversation_id = ?
                    ORDER BY created_at ASC;
                    """,
                    (conv_id,),
                )
                msg_rows = msg_cur.fetchall()

                conv_prompt_tokens = 0
                conv_completion_tokens = 0
                conv_total_tokens = 0

                messages_list: List[MessageResponse] = []
                for m in msg_rows:
                    m_meta = _parse_json(m["metadata"])
                    m_content = m["content"]
                    m_role = m["role"]

                    # Check for explicit token recordings first
                    msg_tok = self._extract_tokens_from_dict(m_meta)
                    if msg_tok:
                        p = msg_tok["prompt_tokens"]
                        c = msg_tok["completion_tokens"]
                        t = msg_tok["total_tokens"]
                    else:
                        # Heuristic estimate based on message role and text length
                        est = self._estimate_tokens(m_content)
                        if m_role == "user":
                            p, c, t = est, 0, est
                        else:
                            p, c, t = 0, est, est

                    conv_prompt_tokens += p
                    conv_completion_tokens += c
                    conv_total_tokens += t

                    if include_messages:
                        messages_list.append(
                            MessageResponse(
                                id=m["id"],
                                conversation_id=m["conversation_id"],
                                role=m["role"],
                                sender_name=m["sender_name"],
                                content=m["content"],
                                metadata=m_meta,
                                created_at=m["created_at"],
                            )
                        )

                # Check if conversation-level metadata overrides or specifies higher totals
                conv_tok_override = self._extract_tokens_from_dict(conv_meta)
                if conv_tok_override and conv_tok_override["total_tokens"] > conv_total_tokens:
                    conv_prompt_tokens = conv_tok_override["prompt_tokens"]
                    conv_completion_tokens = conv_tok_override["completion_tokens"]
                    conv_total_tokens = conv_tok_override["total_tokens"]

                token_usage = TokenUsage(
                    prompt_tokens=conv_prompt_tokens,
                    completion_tokens=conv_completion_tokens,
                    total_tokens=conv_total_tokens,
                )

                analytics_items.append(
                    ConversationAnalyticsItem(
                        id=conv_id,
                        title=row["title"],
                        agent_type=conv_type,
                        created_at=row["created_at"],
                        updated_at=row["updated_at"],
                        message_count=len(msg_rows),
                        token_usage=token_usage,
                        metadata=conv_meta,
                        messages=messages_list,
                    )
                )

                # Update agent breakdown
                if conv_type not in breakdown:
                    breakdown[conv_type] = AgentTokenStats(
                        agent_type=conv_type,
                        conversation_count=0,
                        prompt_tokens=0,
                        completion_tokens=0,
                        total_tokens=0,
                    )
                stats = breakdown[conv_type]
                stats.conversation_count += 1
                stats.prompt_tokens += conv_prompt_tokens
                stats.completion_tokens += conv_completion_tokens
                stats.total_tokens += conv_total_tokens

                # Update global totals
                global_prompt_tokens += conv_prompt_tokens
                global_completion_tokens += conv_completion_tokens
                global_total_tokens += conv_total_tokens

            return ConversationAnalyticsResponse(
                total_conversations=len(analytics_items),
                total_tokens=TokenUsage(
                    prompt_tokens=global_prompt_tokens,
                    completion_tokens=global_completion_tokens,
                    total_tokens=global_total_tokens,
                ),
                breakdown_by_agent=breakdown,
                conversations=analytics_items,
            )
        finally:
            conn.close()



    def clear_all_conversations(self) -> int:
        conn = get_db_connection()
        try:
            with conn:
                cur = conn.execute("DELETE FROM conversations;")
                return cur.rowcount
        finally:
            conn.close()

    def record_resume_analysis(
        self,
        filename: str,
        target_role: Optional[str],
        job_description: Optional[str],
        raw_text: str,
        result: Dict[str, Any],
        model: Optional[str] = None,
    ) -> str:
        """
        Persists a completed Resume Analyzer execution into the history store.
        Saves candidate profile, score breakdown, enhancements, verification audit,
        and multi-agent execution steps with exact/estimated token counts.
        """
        conv_id = str(uuid.uuid4())
        now = _utc_now_iso()

        extracted = result.get("extracted_profile") or {}
        analysis = result.get("analysis") or {}
        enhancements = result.get("enhancements") or {}
        verification = result.get("verification")
        agent_trace = result.get("agent_trace") or []
        active_model = model or result.get("model") or "llama-3.3-70b-versatile"

        candidate_name = extracted.get("full_name") or extracted.get("name") or "Candidate"
        role_label = target_role or extracted.get("current_title") or "Professional Profile"
        title = f"Resume Analysis: {candidate_name} ({role_label})"

        prompt_chars = len(raw_text) + len(job_description or "") + len(target_role or "") + 1200
        completion_chars = len(json.dumps(result))
        prompt_tokens = max(10, (prompt_chars + 3) // 4)
        completion_tokens = max(10, (completion_chars + 3) // 4)
        total_tokens = prompt_tokens + completion_tokens

        token_usage_dict = {
            "prompt_tokens": prompt_tokens,
            "completion_tokens": completion_tokens,
            "total_tokens": total_tokens,
        }

        metadata = {
            "type": "resume_analyzer",
            "model": active_model,
            "filename": filename,
            "target_role": target_role,
            "job_description": job_description,
            "raw_text_preview": raw_text[:500] + ("..." if len(raw_text) > 500 else ""),
            "overall_score": analysis.get("overall_score", 0),
            "tokens": token_usage_dict,
            "extracted_profile": extracted,
            "analysis": analysis,
            "enhancements": enhancements,
            "verification": verification,
            "agent_trace": agent_trace,
        }

        conn = get_db_connection()
        try:
            with conn:
                conn.execute(
                    """
                    INSERT INTO conversations (id, title, agent_type, metadata, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?);
                    """,
                    (conv_id, title, "resume_analyzer", json.dumps(metadata), now, now),
                )

                # 1. User Ingestion step log
                conn.execute(
                    """
                    INSERT INTO messages (id, conversation_id, role, sender_name, content, metadata, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?);
                    """,
                    (
                        str(uuid.uuid4()),
                        conv_id,
                        "user",
                        "User",
                        f"Submitted resume '{filename}' ({len(raw_text):,} characters) for target role: '{role_label}'.",
                        json.dumps({"filename": filename, "target_role": target_role, "model": active_model}),
                        now,
                    ),
                )

                # 2. Extractor Agent step log
                skills_list = extracted.get("skills", [])
                exp_list = extracted.get("experience", [])
                conn.execute(
                    """
                    INSERT INTO messages (id, conversation_id, role, sender_name, content, metadata, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?);
                    """,
                    (
                        str(uuid.uuid4()),
                        conv_id,
                        "agent",
                        "Agent 1: Profile Extractor",
                        f"Extracted candidate profile: '{candidate_name}'. Identified {len(skills_list)} categorized skills and {len(exp_list)} work history records.",
                        json.dumps({"candidate_name": candidate_name, "skills_count": len(skills_list), "model": active_model}),
                        now,
                    ),
                )

                # 3. Analyzer Agent step log
                overall_score = analysis.get("overall_score", 0)
                conn.execute(
                    """
                    INSERT INTO messages (id, conversation_id, role, sender_name, content, metadata, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?);
                    """,
                    (
                        str(uuid.uuid4()),
                        conv_id,
                        "agent",
                        "Agent 2: ATS & Quality Scorer",
                        f"Calculated ATS Readiness Score: {overall_score}/100. Discovered {len(analysis.get('strengths', []))} key strengths and {len(analysis.get('weaknesses', []))} areas for improvement.",
                        json.dumps({"overall_score": overall_score, "model": active_model}),
                        now,
                    ),
                )

                # 4. Enhancer Agent step log
                rewrites = enhancements.get("bullet_rewrites", [])
                conn.execute(
                    """
                    INSERT INTO messages (id, conversation_id, role, sender_name, content, metadata, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?);
                    """,
                    (
                        str(uuid.uuid4()),
                        conv_id,
                        "agent",
                        "Agent 3: Resume Coach & Enhancer",
                        f"Formulated executive summary and generated {len(rewrites)} before/after bullet rewrites with quantified impact.",
                        json.dumps({"rewrites_count": len(rewrites), "model": active_model}),
                        now,
                    ),
                )

                # 5. Verifier Agent step log (if ran)
                if verification:
                    v_score = verification.get("verified_score", overall_score)
                    v_meta = dict(verification)
                    v_meta["model"] = active_model
                    conn.execute(
                        """
                        INSERT INTO messages (id, conversation_id, role, sender_name, content, metadata, created_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?);
                        """,
                        (
                            str(uuid.uuid4()),
                            conv_id,
                            "agent",
                            "Agent 4: QA Verifier Auditor",
                            f"Audited initial score ({overall_score}/100 < 90). Verified fixes resulting in adjusted quality score: {v_score}/100.",
                            json.dumps(v_meta),
                            now,
                        ),
                    )

            return conv_id
        finally:
            conn.close()

    def record_job_search(
        self,
        filename: str,
        target_role: Optional[str],
        preferred_location: Optional[str],
        raw_text: str,
        result: Dict[str, Any],
        model: Optional[str] = None,
    ) -> str:
        """
        Persists a completed Job Search execution into the history store.
        Saves candidate criteria, discovered jobs, ATS match ratings,
        pitch strategy, and execution steps with token counts.
        """
        conv_id = str(uuid.uuid4())
        now = _utc_now_iso()

        cand = result.get("candidate_profile") or {}
        market = result.get("market_parameters") or {}
        jobs = result.get("discovered_jobs") or []
        ranking = result.get("ranking_summary") or {}
        agent_trace = result.get("agent_trace") or []
        active_model = model or result.get("model") or "llama-3.3-70b-versatile"

        cand_name = cand.get("name") or "Candidate"
        role_label = target_role or cand.get("current_title") or "Opportunity Search"
        loc_label = preferred_location or "Remote / Global"
        title = f"Job Search: {role_label} ({loc_label})"

        top_match = max([j.get("match_score", 0) for j in jobs], default=0)

        prompt_chars = len(raw_text) + len(target_role or "") + len(preferred_location or "") + 1500
        completion_chars = len(json.dumps(result))
        prompt_tokens = max(10, (prompt_chars + 3) // 4)
        completion_tokens = max(10, (completion_chars + 3) // 4)
        total_tokens = prompt_tokens + completion_tokens

        token_usage_dict = {
            "prompt_tokens": prompt_tokens,
            "completion_tokens": completion_tokens,
            "total_tokens": total_tokens,
        }

        metadata = {
            "type": "job_search",
            "model": active_model,
            "filename": filename,
            "target_role": target_role,
            "preferred_location": preferred_location,
            "raw_text_preview": raw_text[:500] + ("..." if len(raw_text) > 500 else ""),
            "job_count": len(jobs),
            "top_match_score": top_match,
            "tokens": token_usage_dict,
            "candidate_profile": cand,
            "market_parameters": market,
            "discovered_jobs": jobs,
            "ranking_summary": ranking,
            "agent_trace": agent_trace,
        }

        conn = get_db_connection()
        try:
            with conn:
                conn.execute(
                    """
                    INSERT INTO conversations (id, title, agent_type, metadata, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?);
                    """,
                    (conv_id, title, "job_search", json.dumps(metadata), now, now),
                )

                # 1. Search Query log
                conn.execute(
                    """
                    INSERT INTO messages (id, conversation_id, role, sender_name, content, metadata, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?);
                    """,
                    (
                        str(uuid.uuid4()),
                        conv_id,
                        "user",
                        "User",
                        f"Initiated multi-agent job search for '{role_label}' in '{loc_label}' using '{filename}'.",
                        json.dumps({"target_role": target_role, "location": preferred_location, "model": active_model}),
                        now,
                    ),
                )

                # 2. Market Synthesizer log
                bool_query = market.get("boolean_query", "")
                conn.execute(
                    """
                    INSERT INTO messages (id, conversation_id, role, sender_name, content, metadata, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?);
                    """,
                    (
                        str(uuid.uuid4()),
                        conv_id,
                        "agent",
                        "Agent 2: Market Query Synthesizer",
                        f"Synthesized high-precision boolean search query: '{bool_query}'.",
                        json.dumps({"query": bool_query, "model": active_model}),
                        now,
                    ),
                )

                # 3. Discovery & ATS Matcher log
                conn.execute(
                    """
                    INSERT INTO messages (id, conversation_id, role, sender_name, content, metadata, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?);
                    """,
                    (
                        str(uuid.uuid4()),
                        conv_id,
                        "agent",
                        "Agent 3 & 4: Discovery & ATS Matcher",
                        f"Scanned developer boards and matched {len(jobs)} live vacancies. Top ATS compatibility score: {top_match}%.",
                        json.dumps({"jobs_count": len(jobs), "top_match": top_match, "model": active_model}),
                        now,
                    ),
                )

                # 4. Opportunity Ranking log
                rec = ranking.get("top_recommendation", "")
                conn.execute(
                    """
                    INSERT INTO messages (id, conversation_id, role, sender_name, content, metadata, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?);
                    """,
                    (
                        str(uuid.uuid4()),
                        conv_id,
                        "agent",
                        "Agent 5: Opportunity Ranking Agent",
                        f"Synthesized strategic pitch guidance and personalized application angles. Top recommendation: {rec[:120]}...",
                        json.dumps({"recommendation": rec, "model": active_model}),
                        now,
                    ),
                )

            return conv_id
        finally:
            conn.close()


conversation_service = ConversationService()
