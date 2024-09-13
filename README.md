# BITS Backend

## Installation

- Set up RMIT Val FastAPI: https://github.com/Khang5687/revChatVal/tree/fastapi

- Run FastAPI Server locally on port `8000`.

- Install npm dependencies

- Run the server

```bash
npx nodemon server.js
```

## API Usage

### Load conversation history

Support Pagination

**`GET /api/gpt/conversations`**


**Sample Response**

```python
{
    "conversations": [
        {
            "conversation_id": "66cdabbe38a3dba6310f5dcb",
            "title": "Monthly Spending Analysis",
            "createdAt": "2024-08-27T10:34:38.399Z",
        }
    ],
    "currentPage": 1,
    "totalPages": 1,
    "totalConversations": 1,
}
```

### Load all messages in a conversation

**`GET /api/gpt/conversations/:conversationId`**

**Response**

```python
{
    "title": "Monthly Spending Analysis",
    "settings": {"response_length": "medium", "temperature": 0.2},
    "messages": [
        {
            "role": "user",
            "content": "Analyze my July Spendings"
        },
        {
            "role": "assistant",
            "content": "Sure, let's break down your July spendings...",
        },
        ...
    ],
}


```

### Get Suggestion Prompts

Generate an array of 4 prompts

**`POST /api/gpt/getPrompts`**

**Header Payload**

```javascript
{
    "messages": [
        {
            "role": "user",
            "content": "Analyze my July Spendings"
        },
        {
            "role": "assistant",
            "content": "Sure, let's break down your July spendings...",
        },
        ...
    ],
}
```

**Note**: messages are optional, if none is supplied, default prompts will be returned instead.

**Sample Response**

```python
{
    "prompts": ["...", "...", "...", "..."]
}
```

### Get GPT's response

This will also save the user's and AI's messages to the main conversations.

**`POST /api/gpt/generate`**

**Header Payload**

```python
{
        "conversation_id": "66cdabbe38a3dba6310f5dcb",

        "messages": [
        {
            "role": "user",
            "content": "Analyze my July Spendings"
        },
        {
            "role": "assistant",
            "content": "Sure, let's break down your July spendings...",
        },
            "role": "user",
            "content": "Great! now..."
        ],

        "settings": {
            "temperature": float (from 0.1 to 1.0),
            "response_length": string ("short", "medium", "long"),
        },

        "transaction_start_date": string (ddmmyy) e.g. 180223,
        "transaction_end_date": string (ddmmyy),
}
```

**Note**: If you want to add a date filter, supply `transaction_start_date` and `transaction_end_date`. If they are empty, then ChatGPT will see all the transactions.

`settings` is optional, if not supplied, it will use the settings parameters stored in each conversations.

**Sample Response**

```python
{
    "conversation_id": "66cdabbe38a3dba6310f5dcb"
    "title": "Monthly Spending Analysis",
    "content": "Your July spending...",
}
```

### Delete conversation

Manually **delete** the conversation

**`DELETE /api/gpt/conversation/:conversation_id`**

**Sample Response**

```python
{
    "success: "Deleted successfully"
}
```