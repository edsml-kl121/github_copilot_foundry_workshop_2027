# Feature Specification: MOF HR Chat — HR Policy Chatbot

**Feature Branch**: `001-hr-chatbot-foundry`

**Created**: 2026-05-18

**Status**: Draft

**Input**: User description: "Build a chatbot application that can help me answer query regarding HR pdf using Microsoft Foundry and File search tool and the data we use is at /data please also read the meeting transcript from data/meeting_transcript.txt and follow the plan there"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ask HR Policy Question (Priority: P1)

An HR staff member opens the MOF HR Chat web interface, types a question about
HR policy (e.g., "พนักงานหญิงลาคลอดได้กี่วัน?" — "How many days can female
employees take maternity leave?") and receives an accurate, Thai-language answer
grounded in the official HR policy document.

**Why this priority**: This is the core value proposition of the entire application.
Without this story there is no product. It directly replaces the need to call an
HR officer for routine policy lookups.

**Independent Test**: Open the application, type a question covered by the HR policy
PDF, and verify the chatbot returns a relevant, accurate Thai-language answer. This
story alone constitutes a complete, demonstrable PoC.

**Acceptance Scenarios**:

1. **Given** the application is running and the HR policy document has been loaded,
   **When** an HR staff member submits a question about leave entitlements in Thai,
   **Then** the chatbot returns a Thai-language answer that accurately reflects the
   policy document content, within 5 seconds.
2. **Given** the application is running,
   **When** the staff member asks a question on a topic not covered by the loaded
   document,
   **Then** the chatbot clearly states it could not find relevant information rather
   than fabricating an answer.
3. **Given** the application is running,
   **When** the staff member submits a question,
   **Then** a loading indicator is visible until the answer appears.

---

### User Story 2 - Multi-Turn Conversation (Priority: P2)

An HR staff member asks a follow-up question that refers back to a previous answer
in the same session (e.g., "แล้วถ้าลาก่อนครบกำหนด จะเป็นอย่างไร?" — "What if
they return before the full period?"). The chatbot understands the context and
provides a relevant, coherent follow-up answer.

**Why this priority**: Single-turn Q&A is valuable but staff frequently ask
clarifying or follow-up questions. Supporting context window significantly improves
the usability of the chatbot for real HR queries.

**Independent Test**: Submit an initial question, then submit a follow-up question
that uses pronouns or short-hand references to the first topic. Verify the chatbot
answers correctly using the conversational context, not as if it were a brand-new
query.

**Acceptance Scenarios**:

1. **Given** a session where the user already asked one question and received an
   answer, **When** the user asks a follow-up question referencing the same subject
   without repeating all context, **Then** the chatbot answers correctly using the
   prior exchange as context.
2. **Given** a session with more than 5 prior exchanges,
   **When** the user sends a new message,
   **Then** the chatbot uses only the 5 most recent exchanges as context (oldest
   turns are silently dropped).
3. **Given** the user refreshes the browser,
   **When** the page reloads,
   **Then** the conversation history is cleared and a fresh session begins.

---

### User Story 3 - Visible Disclaimer and Brand Identity (Priority: P3)

A new user opens the application and immediately sees the chatbot branded as
"MOF HR แชท" with a blue-and-white theme, and a disclaimer informing them that
AI responses may be inaccurate and they should verify with the HR department.

**Why this priority**: Governance and trust are critical in a government context.
Users must understand the limitations of AI before relying on it for policy
decisions. Brand identity reinforces organisational ownership.

**Independent Test**: Open the application in a browser. Verify (a) the chatbot is
labelled "MOF HR แชท", (b) the colour scheme is blue and white, and (c) the text
"ข้อมูลจาก AI อาจมีความคลาดเคลื่อน กรุณาตรวจสอบกับฝ่าย HR โดยตรง" is visible
without scrolling.

**Acceptance Scenarios**:

1. **Given** a user opens the application for the first time,
   **When** the page loads,
   **Then** the disclaimer text "ข้อมูลจาก AI อาจมีความคลาดเคลื่อน
   กรุณาตรวจสอบกับฝ่าย HR โดยตรง" is permanently displayed at the bottom of
   the chat area.
2. **Given** the chat area is filled with a long conversation,
   **When** the user scrolls down,
   **Then** the disclaimer remains anchored at the bottom and is always readable.
3. **Given** the page loads,
   **When** a user views the interface,
   **Then** the primary colours are blue and white and the chatbot is labelled
   "MOF HR แชท".

---

### Edge Cases

- What happens when the HR PDF document contains no information on the queried topic?
  (Expected: chatbot responds with a polite "not found" message in Thai, not silence
  or an error code.)
- What happens when the Foundry service is temporarily unreachable?
  (Expected: chatbot displays a user-friendly Thai error message; the page does not
  crash or show raw technical errors.)
- What happens when the user submits an empty message?
  (Expected: the send action is blocked; no API call is made.)
- What happens when the user submits the same question multiple times in rapid
  succession?
  (Expected: each question is queued and answered; no duplicate submissions that
  produce garbled state.)
- What happens when the document uploaded to Foundry contains non-Thai characters
  alongside Thai text?
  (Expected: the chatbot still answers correctly; layout does not break.)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The chatbot MUST answer questions in Thai using a semi-formal register
  (กึ่งทางการ), avoiding overly stiff bureaucratic language.
- **FR-002**: Answers MUST be grounded in the HR policy documents available in the
  `/data` directory; the chatbot MUST NOT fabricate policy details not present in
  those documents.
- **FR-003**: The chatbot MUST maintain conversation context for the 5 most recent
  message exchanges within a single session, using a sliding-window approach.
- **FR-004**: Conversation history MUST be stored in memory only and MUST NOT persist
  after the browser session ends (page refresh or tab close resets the session).
- **FR-005**: The application MUST display a permanent, always-visible disclaimer:
  "ข้อมูลจาก AI อาจมีความคลาดเคลื่อน กรุณาตรวจสอบกับฝ่าย HR โดยตรง" at the
  bottom of the chat interface.
- **FR-006**: The application MUST display a loading/thinking indicator while
  awaiting a response from the AI service.
- **FR-007**: The application MUST display a user-friendly Thai-language error message
  when the AI service is unreachable or returns an error; raw technical errors or
  stack traces MUST NOT be shown to the user.
- **FR-008**: The chat interface MUST use a blue and white colour scheme and MUST be
  labelled "MOF HR แชท".
- **FR-009**: The interface MUST be responsive and usable on standard desktop
  browser viewport widths.
- **FR-010**: The send button MUST be disabled and no API call MUST be made when the
  user's input field is empty.

### Key Entities

- **ChatMessage**: A single message in the conversation. Has a sender role (user or
  assistant), message content (text in Thai), and a timestamp. Stored in memory only.
- **ConversationSession**: The in-memory collection of ChatMessage objects for the
  current browser session. Maintains at most 10 messages (5 user + 5 assistant turns).
  Discarded on page refresh.
- **HRPolicyDocument**: The source PDF document(s) in `/data` that form the chatbot's
  knowledge base. Read-only reference material; not modified by the application.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An HR staff member can obtain a correct answer to a common leave-policy
  question (e.g., maternity leave duration) in under 5 seconds without contacting the
  HR office directly.
- **SC-002**: For questions whose answers are present in the loaded HR documents,
  the chatbot provides a correct, document-grounded answer at least 90% of the time
  during demo validation.
- **SC-003**: A follow-up question that references a prior answer in the same session
  receives a contextually appropriate response rather than treating the query as
  isolated.
- **SC-004**: The disclaimer is visible to 100% of users who open the application,
  without any additional navigation or scrolling required on initial load.
- **SC-005**: The HR team can start using the chatbot on a local machine within
  5 minutes of cloning the repository and setting up the configuration file.

## Assumptions

- The application is deployed and run locally; no cloud hosting, CI/CD pipeline, or
  internet-facing URL is required for Phase 1.
- The initial knowledge base is the `thai_leave_policy.pdf` document located in
  `/data`. Additional documents may be added in future phases.
- No user authentication is required to access the chatbot; it is accessible directly
  when the application starts.
- The target user audience for Phase 1 is 1–2 HR staff members; high concurrency and
  load scaling are out of scope.
- The Foundry File Search capability handles document indexing and retrieval
  internally; no separate vector database setup is required.
- Credentials for the AI service are provided via a local environment configuration
  file that is not committed to source control.
- The application requires only a modern desktop web browser to use; no mobile-specific
  optimisation is in scope for Phase 1.
- Chat responses from the AI service are streamed where possible to improve perceived
  responsiveness; if streaming is not available the full response is displayed on
  completion.
