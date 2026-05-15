# Feature Specification: MOF HR Chatbot (MOF HR แชท)

**Feature Branch**: `001-mof-hr-chatbot`

**Created**: 2026-05-15

**Status**: Draft

**Input**: User description: "Build a chatbot application that can help me answer query regarding HR pdf using Microsoft Foundry and File search tool and the data we use is at /data — based on meeting transcript data/meeting_transcript.txt"

**Source**: Meeting transcript — บันทึกการประชุมความต้องการระบบ Chatbot HR, กระทรวงการคลัง ฝ่ายทรัพยากรบุคคล (14 พฤษภาคม 2568)

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 — HR Staff Asks a Policy Question (Priority: P1)

An HR team member types a question about an HR policy topic (e.g., leave entitlements, welfare
benefits, document request procedures) into the chat interface. The system searches the uploaded
HR PDF documents via the File Search tool, retrieves relevant content, and responds in Thai with
a friendly, semi-formal tone.

**Why this priority**: This is the core value proposition. Without accurate policy answers the
chatbot has no purpose. All other stories depend on this working correctly.

**Independent Test**: Can be fully tested by typing a leave-policy question (e.g., "ลาพักร้อนได้กี่วันต่อปี?")
and verifying the response references the content of `thai_leave_policy.pdf` and is written in
semi-formal Thai.

**Acceptance Scenarios**:

1. **Given** the chat interface is open, **When** an HR staff member types "พนักงานมีสิทธิ์ลาพักร้อนได้กี่วัน?", **Then** the bot responds in Thai with accurate leave entitlement information sourced from the HR PDF, within 30 seconds.
2. **Given** a question is submitted, **When** matching content exists in the HR documents, **Then** the response is in semi-formal Thai (กึ่งทางการ) — not overly stiff, not overly casual.
3. **Given** a question is submitted, **When** no relevant content is found in the HR documents, **Then** the bot responds politely in Thai acknowledging it could not find the information and suggests contacting HR staff directly.

---

### User Story 2 — Multi-Turn Conversation with Context (Priority: P2)

An HR staff member asks a follow-up question that refers to a previous answer in the same
session (e.g., "แล้วถ้าลาป่วยล่ะ?" after asking about annual leave). The system uses the
last 5 turns of conversation history to understand the context and provide a coherent answer.

**Why this priority**: Without conversational continuity the bot feels like a FAQ lookup tool,
not a chat assistant. Context retention is the second most important quality criterion.

**Independent Test**: Can be tested by sending two related messages ("พนักงานมีสิทธิ์ลาพักร้อนได้กี่วัน?" then "แล้วลาคลอดล่ะ?") and verifying the second response understands the context of leave policy without the user having to repeat themselves.

**Acceptance Scenarios**:

1. **Given** an HR staff member has exchanged at least 2 messages with the bot, **When** they ask a follow-up question referencing prior context, **Then** the bot uses the conversation history to provide a contextually appropriate answer.
2. **Given** a session has accumulated more than 5 prior turns, **When** a new question is asked, **Then** only the 5 most recent turns are retained in context (oldest turn is dropped — sliding window).
3. **Given** a new chat session is started, **When** the first message is sent, **Then** no history from a previous session is included in the context.

---

### User Story 3 — Disclaimer Always Visible (Priority: P3)

The HR team requires that a disclaimer be permanently displayed in the chat UI so users are
always reminded that AI answers may contain errors and should be verified with actual HR staff.

**Why this priority**: Compliance and trust. This is a governance requirement from the meeting
— it must be present at all times but does not affect core functionality.

**Independent Test**: Can be tested by opening the chat UI and verifying the disclaimer text
is visible without any user interaction, and remains visible during and after conversation.

**Acceptance Scenarios**:

1. **Given** the chat interface loads, **When** no interaction has occurred yet, **Then** the disclaimer "ข้อมูลจาก AI อาจมีความคลาดเคลื่อน กรุณาตรวจสอบกับฝ่าย HR โดยตรง" is visible at the bottom of the page.
2. **Given** an active conversation is in progress, **When** messages are exchanged, **Then** the disclaimer remains continuously visible and is not hidden or scrolled away.
3. **Given** the chat UI is displayed, **When** the page is rendered, **Then** the disclaimer uses the blue-and-white color scheme and does not obstruct the message input area.

---

### Edge Cases

- What happens when the HR PDF document is empty or cannot be read by the File Search tool?
- How does the system handle a question submitted entirely in English when the expected language is Thai?
- What happens if the Azure AI Foundry API is unreachable (network error, credential expiry)?
- How does the system handle extremely long user inputs that may exceed API token limits?
- What if the user sends a blank or whitespace-only message?

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST provide a chat interface that accepts typed text questions from HR staff.
- **FR-002**: The system MUST use the Azure AI Foundry File Search tool to search uploaded HR policy PDF documents stored in the `/data` directory — no external vector database is used.
- **FR-003**: The system MUST respond in Thai using a semi-formal, friendly tone (กึ่งทางการ) for all answers.
- **FR-004**: The system MUST maintain a rolling conversation history of exactly the last 5 turns (sliding window); history beyond 5 turns MUST be dropped and not sent to the AI.
- **FR-005**: The system MUST permanently display the disclaimer "ข้อมูลจาก AI อาจมีความคลาดเคลื่อน กรุณาตรวจสอบกับฝ่าย HR โดยตรง" at the bottom of the chat UI.
- **FR-006**: The system MUST display the application name "MOF HR แชท" in the UI header.
- **FR-007**: The UI MUST use a blue-and-white color scheme with a clean, uncluttered design.
- **FR-008**: The system MUST run entirely on a local machine — no cloud hosting or server deployment is required for Phase 1.
- **FR-009**: When a question has no matching content in any HR document, the system MUST respond politely in Thai suggesting the user contact HR staff directly.
- **FR-010**: The system MUST be a single JavaScript service (no separate frontend/backend split) consistent with the team's JavaScript expertise and the PoC scope.
- **FR-011**: Azure AI Foundry credentials (endpoint, API key/token, agent ID) MUST be configured via environment variables, not hardcoded.

### Key Entities

- **Chat Session**: Represents one active conversation. Contains a sliding window of up to 5 message turns. No persistence between restarts.
- **Chat Message**: A single user question or bot reply within a session. Has a role (user/assistant) and text content in Thai.
- **HR Document**: A PDF file located in `/data` (e.g., `thai_leave_policy.pdf`) that has been uploaded to the Azure AI Foundry File Search vector store. The bot's answers are grounded exclusively in these documents.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An HR staff member can ask a leave-policy question and receive a relevant Thai-language answer within 30 seconds under normal operating conditions.
- **SC-002**: For questions whose answers exist in the uploaded HR documents, the bot provides a correct, document-grounded response at least 90% of the time during internal testing.
- **SC-003**: When a follow-up question is asked within the same session, the bot correctly uses prior context (from within the last 5 turns) in its response.
- **SC-004**: The disclaimer text is visible on every page load without any user interaction required.
- **SC-005**: The application reaches a ready-to-use state within 3 seconds of being started (excluding initial Azure AI Foundry connection handshake time).
- **SC-006**: Internal HR testers (1–2 people) can complete a test session — ask 5 policy questions — without encountering an unhandled error or application crash.

---

## Assumptions

- Azure AI Foundry project credentials (endpoint URL, API key, agent/model deployment name) are available and will be supplied via a `.env` file by the IT team before testing. Authentication is API-key-based; no Microsoft Entra ID / `az login` flow is used.
- The HR policy PDF files in `/data` (including `thai_leave_policy.pdf`) will be manually uploaded to the Azure AI Foundry File Search vector store prior to the first test run.
- The scope of Phase 1 is limited to 1–2 internal HR team members; there is no need for user authentication, multi-user sessions, or access control.
- No long-term storage of conversation history is required; history exists only in-process for the duration of a single run.
- The application is run on a developer machine with Node.js (v18+) already installed.
- Mobile and browser-based access are out of scope for Phase 1; the interface runs locally.
- The UI reference design (blue-and-white, clean chat layout) is approximated from the `data/UI_redesign.png` mockup provided.
- Only Thai-language responses are required; the system prompt will instruct the AI to always reply in Thai.
