
# API Documentation

## Base URL

`http://localhost:3000`

---

### POST `/api/bootstrap-and-enter-group`

**Description:**  
Bootstraps a domain for a given address, and after 30 seconds, enters the specified group.

**Request Body:**

```json
{
  "address": "string",
  "groupId": "string",
  "privateKeyHex": "string"
}
```

**Response:**

```json
{
  "status": "bootstrap complete",
  "address": "string"
}
```

**Note:**  
After the bootstrap is complete, the group will be entered after a 30-second delay. The response does not wait for the group entry but will log the action internally.

**Errors:**

- `500` – Error bootstrapping domain or entering group, includes error message.



### POST `/api/bootstrap`

**Description:**  
Bootstraps a domain for a given address.

**Request Body:**

```json
{
  "address": "string",
  "privateKeyHex": "string"
}
```

**Response:**

```json
{
  "status": "bootstrap complete",
  "address": "string"
}
```

**Errors:**

- `500` – Error bootstrapping domain, includes error message.

---

### POST `/api/enter-group`

**Description:**  
Enters a group for a specified address and groupId.

**Request Body:**

```json
{
  "address": "string",
  "groupId": "string"
}
```

**Response:**

```json
{
  "status": "group entered",
  "groupId": "string"
}
```

**Errors:**

- `500` – Error entering group, includes error message.

---

### POST `/api/get-group-message-list`

**Description:**  
Gets the message list of a group for a specified address and groupId.

**Request Body:**

```json
{
  "address": "string",
  "groupId": "string",
  "size": "number"
}
```

**Response:**

```json
{
  "status": "success",
  "messageList": ["object"]
}
```

**Errors:**

- `500` – Error fetching group message list, includes error message.

---

### POST `/api/send-message-to-group`

**Description:**  
Sends a message to a group for a specified address and groupId.

**Request Body:**

```json
{
  "address": "string",
  "groupId": "string",
  "message": "string"
}
```

**Response:**

```json
{
  "status": "message sent",
  "sendMessageResult": "object"
}
```

**Errors:**

- `500` – Error sending message, includes error message.

---


### POST `/api/leave-group`

**Description:**  
Leaves a group for a specified address and groupId.

**Request Body:**

```json
{
  "address": "string",
  "groupId": "string"
}
```

**Response:**

```json
{
  "status": "group left",
  "groupId": "string"
}
```

**Errors:**

- `500` – Error leaving group, includes error message.

---

### POST `/api/join-group`

**Description:**  
Joins a group for a specified address and groupId.

**Request Body:**

```json
{
  "address": "string",
  "groupId": "string"
}
```

**Response:**

```json
{
  "status": "group joined",
  "groupId": "string"
}
```

**Errors:**

- `500` – Error joining group, includes error message.

---

### POST `/api/set-for-me-groups`

**Description:**  
Sets "for me" groups for a specified address, including groups to include and exclude.

**Request Body:**

```json
{
  "address": "string",
  "includes": ["string"],
  "excludes": ["string"]
}
```

**Response:**

```json
{
  "status": "for me groups set"
}
```

**Errors:**

- `500` – Error setting "for me" groups, includes error message.

---

### GET `/api/get-for-me-group-list`

**Description:**  
Gets the list of "for me" groups for a specified address.

**Query Parameters:**

- `address`: The address for which to retrieve the "for me" group list.

**Response:**

```json
{
  "status": "success",
  "forMeGroupList": ["string"]
}
```

**Errors:**

- `500` – Error fetching "for me" group list, includes error message.

---

### GET `/api/get-my-group-list`

**Description:**  
Gets the list of groups the user is in for a specified address.

**Query Parameters:**

- `address`: The address for which to retrieve the group list.

**Response:**

```json
{
  "status": "success",
  "myGroupList": ["string"]
}
```

**Errors:**

- `500` – Error fetching group list, includes error message.

---


### POST `/api/destroy`

**Description:**  
Destroys a domain for a specified address and removes it from memory.

**Request Body:**

```json
{
  "address": "string"
}
```

**Response:**

```json
{
  "status": "destroy complete",
  "address": "string"
}
```

**Errors:**

- `500` – Error destroying domain, includes error message.

---

## Error Handling

For all routes, if an error occurs, the server will respond with a 500 status code and a message like:

```json
{
  "status": "error",
  "message": "Error message"
}
```
