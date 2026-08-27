---
name: ai-operations
description: Use when designing or implementing OpsPilot AI capabilities, LLM workflows, recommendations, agents, tool calling, retrieval, evaluations, or AI safety controls.
---

# OpsPilot AI Operations Engineering

## Mission
AI exists to improve operational outcomes, not to make the product look more futuristic.

Before implementing AI, prove:
1. The user has a real problem.
2. AI materially improves the workflow.
3. The result can be evaluated.
4. Failure can be contained.
5. The cost is acceptable.

## Prefer bounded AI
Prefer:
- classification
- extraction
- summarization
- prioritization
- recommendation
- anomaly explanation
- structured decision support
- controlled tool execution

Avoid unconstrained autonomous agents unless the requirements clearly justify them.

## AI vs deterministic logic
Use deterministic software for:
- permissions
- financial calculations
- state transitions
- hard business rules
- security decisions
- validation
- irreversible constraints

Use AI where ambiguity, language, pattern recognition, or unstructured information makes it genuinely useful.

## Structured outputs
When AI output drives application logic:
- use structured schemas
- validate model output
- reject malformed output
- use safe defaults
- never assume model compliance

Do not parse fragile free-form text when structured output is available.

## Tool calling
For tools that can change state:
- define narrow tool schemas
- validate arguments server-side
- enforce authorization server-side
- record execution
- make retries safe
- expose meaningful results
- require confirmation for risky/irreversible actions when appropriate

The model must never become an authorization layer.

## Human-in-the-loop
Users should understand:
- what the AI recommends
- relevant evidence/context
- confidence or uncertainty when meaningful
- what action will happen
- how to reject or correct the result

High-impact operations should have explicit human control unless requirements establish safe automation.

## Context and retrieval
Only provide the model with the minimum relevant context.

Consider:
- tenant isolation
- access permissions
- stale data
- source attribution
- prompt injection
- malicious documents
- sensitive information

Never allow retrieved text to override system security rules.

## Prompt engineering
Prompts should be:
- versioned
- testable
- minimal
- explicit about output schema
- explicit about uncertainty
- protected against instruction injection

Do not hide critical business rules only inside prompts.

## Evaluation
For important AI workflows establish representative test cases covering:
- normal cases
- ambiguous cases
- missing data
- adversarial inputs
- incorrect source data
- refusal/fallback cases

Track quality with task-specific metrics rather than generic "looks good."

## Reliability
AI features need:
- timeout handling
- retry policy
- provider failure handling
- malformed-output handling
- fallback behavior
- rate/cost controls

Never allow an AI provider outage to corrupt core operational state.

## Privacy and security
Minimize data sent to external AI providers.

Never expose:
- credentials
- secrets
- unauthorized tenant data
- unnecessary personal/sensitive information

## AI observability
Where appropriate record:
- model/provider
- prompt/version identifier
- latency
- token/cost information
- tool calls
- validation result
- final outcome

Avoid storing raw sensitive prompts/responses unnecessarily.

## Definition of done
An AI feature is complete only when:
- its business purpose is clear
- output is validated
- failure behavior is defined
- authorization is independent of AI
- representative evaluations exist
- cost/latency are understood
- user control is appropriate
