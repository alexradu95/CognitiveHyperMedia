# 🏗️ Architecture Diagrams

## High-Level Request Flow

```mermaid
graph LR
    Client[Client / curl] -- HTTP Request --> Server(src/main.ts Handler);
    Server -- parses & routes --> Bridge(McpBridge Handlers);
    Bridge -- calls --> Store(CognitiveStore);
    Store -- interacts --> KV[Deno.Kv];
    Store -- uses --> SM(StateMachine);
    Store -- returns --> Resource[CognitiveResource / Collection];
    Bridge -- formats --> McpResp{MCP Response};
    Server -- creates --> HttpResp[HTTP Response];
    McpResp --> HttpResp;
    HttpResp -- HTTP Response --> Client;
```

## CognitiveStore Enhancement Process

```mermaid
graph TD
    subgraph CognitiveStore
        direction LR
        Get[store.get / create] --> Enhance(enhanceResource);
        SMDef[Registered StateMachine] --> Enhance;
        Enhance -- reads --> RawData[(Resource Data from KV)];
        Enhance -- adds --> Actions[Default/State Actions];
        Enhance -- adds --> Links[Self/Relationship Links];
        Enhance -- adds --> Hints[Presentation Hints];
        Enhance -- adds --> Prompts[Conversation Prompts];
        RawData --> Result(Enriched CognitiveResource);
        Actions --> Result;
        Links --> Result;
        Hints --> Result;
        Prompts --> Result;
    end
    Get --> Result;

``` 