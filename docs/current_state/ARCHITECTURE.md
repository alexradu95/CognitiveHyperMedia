# 🏗️ Architecture Diagrams

## High-Level Request Flow

```mermaid
graph LR
    Client[Client / curl] -- HTTP Request --> Server(src/main.ts Handler);
    Server -- parses & routes --> Bridge(CognitiveBridge);
    Bridge -- routes to --> ProtoAdapter{IProtocolAdapter};
    ProtoAdapter -- implements --> McpAdapter[McpProtocolAdapter];
    ProtoAdapter -- could implement --> OpenAIAdapter[OpenAI or other protocols];
    McpAdapter -- calls --> Store(CognitiveStore);
    Store -- interacts via --> Adapter{IStorageAdapter};
    Adapter -- implements --> DenoKV[DenoKvAdapter];
    Adapter -- could implement --> OtherDB[Other DB Adapters];
    Store -- uses --> SM(StateMachine);
    Store -- returns --> Resource[CognitiveResource / Collection];
    ProtoAdapter -- formats --> Response{Protocol Response};
    Server -- creates --> HttpResp[HTTP Response];
    Response --> HttpResp;
    HttpResp -- HTTP Response --> Client;
```

## CognitiveStore Enhancement Process

```mermaid
graph TD
    subgraph CognitiveStore
        direction LR
        Get[store.get / create] --> Enhance(enhanceResource);
        SMDef[Registered StateMachine] --> Enhance;
        Enhance -- reads --> RawData[(Resource Data from Storage)];
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

## Storage Adapter Pattern

```mermaid
classDiagram
    class IStorageAdapter {
        <<interface>>
        +create(type, id, data)
        +get(type, id)
        +update(type, id, data)
        +delete(type, id)
        +list(type, options)
    }
    
    class CognitiveStore {
        -storage: IStorageAdapter
        +constructor(storage)
        +create()
        +get()
        +update()
        +delete()
        +getCollection()
        +performAction()
    }
    
    class DenoKvAdapter {
        -kv: Deno.Kv
        +constructor(kv)
        +create()
        +get()
        +update()
        +delete()
        +list()
    }
    
    class FutureAdapters {
        <<abstract>>
        PostgresAdapter
        MongoAdapter
        RedisAdapter
        etc...
    }
    
    CognitiveStore --> IStorageAdapter : uses
    DenoKvAdapter ..|> IStorageAdapter : implements
    FutureAdapters ..|> IStorageAdapter : implements
```

## Protocol Adapter Pattern

```mermaid
classDiagram
    class IProtocolAdapter {
        <<interface>>
        +explore(uri)
        +act(uri, action, payload)
        +create(uri, payload)
        +connect()
        +disconnect()
    }
    
    class CognitiveBridge {
        -store: CognitiveStore
        -adapter: IProtocolAdapter
        +constructor(store, adapter)
        +explore(uri)
        +act(uri, action, payload)
        +create(uri, payload)
    }
    
    class McpProtocolAdapter {
        -store: CognitiveStore
        -mcp: McpServer
        -transport: McpServerTransport
        +constructor(store, options)
        +explore(uri)
        +act(uri, action, payload)
        +create(uri, payload)
        +setTransport(transport)
        -registerTools()
    }
    
    class ProtocolFactory {
        <<static>>
        +createMcpAdapter(store, options)
        +createAdapter(store, protocolType, options)
    }
    
    class FutureAdapters {
        <<abstract>>
        OpenAIAdapter
        AnthropicAdapter
        GeminiAdapter
        etc...
    }
    
    CognitiveBridge --> IProtocolAdapter : uses
    IProtocolAdapter <|.. McpProtocolAdapter : implements
    IProtocolAdapter <|.. FutureAdapters : implements
    ProtocolFactory ..> McpProtocolAdapter : creates
    ProtocolFactory ..> FutureAdapters : creates
```

## Complete Architecture Flow

```mermaid
graph TD
    subgraph "Client Layer"
        Client[HTTP Client]
        AIGENT[AI Agent]
    end
    
    subgraph "Transport Layer"
        HTTP[HTTP Transport]
        Stdio[Stdio Transport]
        SSE[SSE Transport]
    end
    
    subgraph "Protocol Layer"
        Bridge[CognitiveBridge]
        ProtocolFactory[Protocol Factory]
        MCP[McpProtocolAdapter]
        OpenAI[OpenAI/Other Adapters]
    end
    
    subgraph "Domain Layer"
        Store[CognitiveStore]
        Resource[CognitiveResource]
        Collection[CognitiveCollection]
        SM[StateMachine]
    end
    
    subgraph "Storage Layer"
        AdapterFactory[Storage Adapter Factory]
        DenoKV[DenoKvAdapter]
        Postgres[PostgresAdapter]
        Other[Other Storage Adapters]
    end
    
    Client --> HTTP
    AIGENT --> Stdio
    AIGENT --> SSE
    
    HTTP --> Bridge
    Stdio --> Bridge
    SSE --> Bridge
    
    Bridge -- uses --> MCP
    Bridge -- uses --> OpenAI
    ProtocolFactory -- creates --> MCP
    ProtocolFactory -- creates --> OpenAI
    
    MCP -- calls --> Store
    OpenAI -- calls --> Store
    
    Store -- uses --> SM
    Store -- creates --> Resource
    Store -- creates --> Collection
    
    Store -- uses adapter --> AdapterFactory
    AdapterFactory -- creates --> DenoKV
    AdapterFactory -- creates --> Postgres
    AdapterFactory -- creates --> Other
``` 