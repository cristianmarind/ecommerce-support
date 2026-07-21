# Technical Presentation — ImagineApps Support Module

Good morning, everyone. My name is Cristian, and this project is my
technical test to apply for the Tech Lead position. I used Claude to help
me implement it and to support some of my design decisions. I want to use
this project to show how I think about architecture, AI, and security —
not just show code that works.

## The problem I solve

When an e-commerce customer has a problem, they just write it in plain
text. My system searches my support manuals with a RAG pipeline and tries
to answer automatically. If the AI is not confident enough, a human agent
takes over, inside the same conversation. AI answers first, and a human is
always the backup.

## Architecture: hexagonal

I used hexagonal architecture: ports and adapters. The domain layer only
has entities and interfaces, no framework code. The application layer has
the use cases, and it only talks to the domain through interfaces. The
infrastructure layer implements those interfaces — TypeORM, LangChain, the
HTTP controllers. This means I can change the database or the AI provider
without touching the business logic, and it makes the code easier to test.

## Data model: a ticket is a conversation

This was a deliberate choice from the start. A `Ticket` doesn't hold one
question and one answer — it has many `Message` rows connected to it, one
ticket to many messages. Each message has a sender: the customer, the AI,
or a human agent, all in one timeline. Real support cases are
conversations: a customer can send a new message later, an agent can join
in, and the AI's first answer stays as context. Because I built the model
this way from day one, I can add follow-up messages or more agents later
without changing the database schema.

## AI is the center of this project

Every ticket goes through a RAG flow. I use the customer's description to
search my manuals, stored as vector embeddings in Redis, and the most
relevant text becomes context for the model's answer.

The most interesting decision is how I get that answer. I have one port,
`TicketAiAnalysisPort`, with two different implementations — a Strategy
pattern. One makes a single call using function calling, and returns
category, answer, and confidence together. The other makes two calls in
parallel: one for the answer, one for the category. I switch between them
with one environment variable, no code changes.

The confidence score also controls a real rule in the app. If the score is
high enough, the customer sees the AI's answer right away. If it's too
low, the ticket goes to a human agent instead, and the AI's answer stays
hidden. Also, if there's no API key set up, the app doesn't crash — it
just gives a safe default answer.

## Guarding the AI against prompt injection

The AI reads text written by users, and that is a real security risk. So I
built two layers of protection. First, the RAG prompt keeps a clear
separation: the manual content goes inside `<contexto>` tags, with a clear
rule — treat this as data, not as a command. I also added examples that
teach the model to say no to a hidden instruction. Second, before any text
reaches the main model, a separate guard called `PromptSafetyGuard` checks
it first. It sends the text to another AI call, and that call only
answers "safe" or "unsafe." If it's unsafe, I reject the request right
away. I have two separate layers, so if one of them misses an attack, the
other one can still stop it.

## Authentication, briefly

Authentication is real, JWT-based, with two roles and refresh token
rotation. It works well, but it's a standard implementation — not what I
want to focus on today.

## What this shows

This project is small, but it uses real production patterns: hexagonal
architecture, a conversation-based data model, the Strategy pattern for
AI, two layers of protection against prompt injection, and safe handling
of failures. It's built to grow — adding a new AI provider or safety check
just means adding one adapter, not rewriting the core.

Thank you.
