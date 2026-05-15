### Option 2 Plan and Agent mode:

Switch your agent to Plan mode. Type the following with `claude-sonnet-4.6`
```
Please read the meeting transcript at data/meeting_transcript.txt first — it has all the decisions we made about what to build. Then build the chatbot based on that.

The app uses Azure AI Foundry with File Search tool, source files are in /data. Build it with Vite but keep it vanilla HTML, CSS, and JavaScript as much as possible, minimal libraries. Chat history should just live in memory, no database needed.

For any Foundry API calls, follow the examples already in src/01_basic_chat.js, src/02_file_search.js, and src/03_image.js — don't invent your own patterns.
```
Once done press `start implementation`

![alt text](../images/start_implementation.png)

### Chatting to the chatbot

To start the app try:

```
npm run dev
```

Here are some questions to test the chatbot

```
Q1) สวัสดีครับ
Q2) พนักงานหญิงลาคลอดได้กี่วัน
Q3) ผมชื่อมิวจำไว้นะ
Q4) ผมชื่ออะไร
```
![alt text](../images/image.png)

Select agent mode and type the following

```
Generate system design document and use mermaid to generate markdown file called documentation.md
```
(If you haven't already please install the `Markdown Preview Mermaid support` extension from VS code)

switch to GPT-5.4 and agent mode. Type the following prompt
```
Please redesign UI to look like <path_to_image>
```
Look at how our UI design look just like the image we chose:
![alt text](../images/image.png)