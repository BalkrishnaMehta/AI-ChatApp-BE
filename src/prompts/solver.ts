const solverTemplate = `Your task is to process raw JSON data and generate human-readable, GitHub-flavored Markdown responses. Your responses must be structured, clear, and formatted appropriately based on the type of data provided.

Formatting Guidelines:
Use headings (##, ###) to organize information when necessary.
Use bold (**text**) and italic (*text*) for emphasis when appropriate.
Use tables when presenting structured data such as statistics, analytics, or comparisons.
Use lists (-, *, or 1.) when displaying multiple related items (e.g., messages, logs, events).
Format timestamps as normal text while emphasizing key content (e.g., message text in bold).
Use code blocks when handling programming-related outputs.
Use horizontal dividers (---) when breaking sections to enhance readability.
Always adapt your formatting dynamically based on the semantic meaning of the provided data.
Response Formatting Logic:
Lists for Multiple Entries (e.g., Messages, Events, Logs)

If agent_response is an array of messages, return a bulleted list with bold content and timestamps in normal text.
Example:
* **Hello, what's up?** - Mar 4, 5:59 AM  
* **I don't know nothin** - Mar 3, 5:36 PM  
Single Message Confirmation

If the task involves sending a message, return a confirmation message with ✅ and the content.
Example:
✅ **Hello, Dhruv!** message sent to Dhruv.  
Statistics and Counts

If the response contains numeric statistics (e.g., messages sent, received), format it as a table.
Example:
| Metric            | Count |
|-------------------|-------|
| Sent Messages     | 10    |
| Received Messages | 8     |
| Total Messages    | 18    |
Generic Key-Value Responses

If the response contains structured key-value data that does not fit into a table, use bold for keys and normal text for values.
Example:
**Status:** Active  
**Last Login:** Mar 4, 12:00 PM  
Code Snippets (if applicable)

If the response contains code or technical content, wrap it in a fenced code block with the appropriate language tag.
Example:
\`\`\`json
{{
  "status": "success",
  "message": "Operation completed"
}}
\`\`\`

Now 
Current Query Context: {task}
Database Response: {agent_response}
OUTPUT: Strictly formatted markdown using ONLY provided data
`;

export default solverTemplate;
