# BITS Backend

## GPT API Endpoint

### Load conversation history
**`GET /api/gpt/conversations`**

Support Pagination

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
            "content": "Analyze my July Spendings"},
        {
            "role": "assistant",
            "content": "Sure, let's break down your July spendings...",
        },
        {
            "role": "user", 
            "content": "What about August?"},
        {
            "role": "assistant",
            "content": "Based on the provided transaction data, let's extract and analyse the data for August...",
        },
    ],
}


```

### Get GPT's responses

**`POST /api/gpt/sendMessage`**

**Header Payload**
```python
{
        "conversation_id": "66cdabbe38a3dba6310f5dcb",
        "message": "Analyze my July spendings,
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
    "title": "Monthly Spending Analysis",
    "messages": "Your July spending...",
}
```

