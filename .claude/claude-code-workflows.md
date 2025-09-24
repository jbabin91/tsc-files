# Claude Code Workflow Guidance

<!-- AUTO-GENERATED SECTIONS: Workflow patterns maintained by Claude Code -->

This document provides meta-instructions for using Claude Code effectively with the tsc-files project, leveraging ClaudeLog foundation mechanics for optimal development outcomes.

## Plan Mode Usage Patterns

### **When to Trigger Plan Mode (Shift+Tab twice)**

**Always use Plan Mode for:**

- TypeScript compiler integration research
- Package manager detection algorithm design
- Security implementation strategies
- Architecture refactoring across multiple files
- Performance optimization planning
- Complex debugging scenarios

**Plan Mode Workflow:**

1. **Research Phase**: Investigate without making changes
2. **Analysis Phase**: Consider multiple approaches and edge cases
3. **Planning Phase**: Structure implementation steps
4. **Approval Phase**: Present comprehensive plan for human review
5. **Execution Phase**: Implement with explicit human approval

### **💡 Plan Mode Examples**

```text
// 🔍 Trigger Plan Mode for TypeScript CLI research
User: "How should we integrate with the TypeScript compiler API?"
Claude: [Enters Plan Mode, researches TypeScript compiler patterns,
         analyzes security implications, considers error handling,
         presents comprehensive integration plan]

// ⚙️ Trigger Plan Mode for architectural decisions
User: "Should we use execFile or spawn for running TypeScript?"
Claude: [Enters Plan Mode, compares approaches, analyzes security,
         considers cross-platform compatibility, recommends approach]

// 🔒 Trigger Plan Mode for security implementations
User: "How should we handle temporary file security?"
Claude: [Enters Plan Mode, researches secure temp file patterns,
         analyzes attack vectors, designs defense mechanisms,
         validates against security requirements]

// ⚡ Trigger Plan Mode for performance optimization
User: "How can we optimize TypeScript compilation performance?"
Claude: [Enters Plan Mode, analyzes bottlenecks, researches optimization strategies,
         considers memory usage, designs incremental checking approach]
```

## Sub-Agent Delegation Strategies

### **Role-Based Sub-Agent Teams**

#### **Implementation Tasks**

- **Package Manager Expert**: Detection algorithms, environment analysis
- **TypeScript Integration Specialist**: Compiler integration, configuration handling
- **Security Expert**: Validation protocols, penetration testing
- **Performance Specialist**: Optimization, benchmarking, resource management
- **CLI UX Expert**: User experience, error messages, help documentation

#### **Quality Assurance Tasks**

- **Code Reviewer**: Architecture patterns, best practices validation
- **Test Engineer**: Comprehensive test implementation, coverage analysis
- **Documentation Writer**: Technical writing, user guides, API documentation

### **Sub-Agent Delegation Patterns**

**🚀 Parallel Development:**

```markdown
Use Task tool to launch simultaneous sub-agents for:

1. 📦 Package Manager Detection (Lock file parsing + env detection)
2. 🔵 TypeScript Integration (Compiler location + execution)
3. 🔒 Security Validation (Temp files + command sanitization)
4. 🚨 Testing Implementation (Unit tests + integration tests)
5. 📄 Documentation Updates (API docs + usage examples)
```

**🔄 Sequential Validation:**

```markdown
1. 🛠️ Implementation sub-agent creates component
2. 🔒 Security sub-agent validates security protocols
3. ⚡ Performance sub-agent analyzes optimization opportunities
4. 🚨 Test sub-agent implements comprehensive testing
5. 📄 Documentation sub-agent updates relevant docs
6. ✅ Quality sub-agent performs final review
```

## Context Management Strategies

### **File Reading Strategy**

**Explicit Context Loading:**

- Always read relevant documentation before starting tasks
- Use @docs/filename.md syntax for explicit file references
- Load context incrementally based on task requirements
- Avoid loading unnecessary documentation to prevent context bloat

**Context Optimization:**

```markdown
For Implementation Tasks:

1. Read @docs/implementation-strategy.md
2. Read @docs/architecture-details.md
3. Read @docs/security-requirements.md
4. Load specific component documentation as needed

For Testing Tasks:

1. Read @docs/testing-strategy.md
2. Read relevant implementation docs
3. Load test examples and fixtures

For Security Tasks:

1. Read @docs/security-requirements.md
2. Read @docs/architecture-details.md for attack surface analysis
3. Load penetration testing scenarios
```

### **Context Window Management**

**Monitoring:**

- Use `/context` command to inspect token usage
- Watch for high consumption in system tools or MCP tools
- Use `/compact` command when approaching context limits

**Optimization:**

- Keep documentation files focused and modular
- Use explicit imports rather than loading everything
- Delegate complex research to sub-agents to preserve main context
- Use auto-compact feature for long sessions

## UltraThink Decision Points

### **When to Use UltraThink**

**Complex Problem Analysis:**

- TypeScript compiler integration complexities
- Security vulnerability assessment
- Architecture decision trade-offs
- Performance optimization strategies
- Cross-platform compatibility challenges

**Multi-Factor Decision Making:**

- Balancing security vs performance
- Choosing between implementation approaches
- Evaluating third-party library integration
- Planning backwards compatibility strategies

### **UltraThink Workflow**

1. **Problem Decomposition**: Break complex issues into analyzable components
2. **Multi-Perspective Analysis**: Consider security, performance, maintainability, usability
3. **Trade-off Evaluation**: Weigh benefits and risks of different approaches
4. **Recommendation Synthesis**: Combine insights into actionable recommendations
5. **Validation Strategy**: Plan how to verify the chosen approach

## Task-Specific Workflow Patterns

### **TypeScript Integration Tasks**

```markdown
Workflow:

1. Use UltraThink for compiler API research
2. Enter Plan Mode for integration strategy
3. Read @docs/architecture-details.md for system design
4. Read @docs/security-requirements.md for validation protocols
5. Use TypeScript Integration sub-agent for implementation
6. Use Security Expert sub-agent for validation
```

### **Security Implementation Tasks**

```markdown
Workflow:

1. Read @docs/security-requirements.md thoroughly
2. Use UltraThink for threat modeling
3. Use Plan Mode for security architecture design
4. Use Security Expert sub-agent for implementation
5. Use Penetration Testing sub-agent for validation
6. Document security protocols and test results
```

### **Testing Implementation Tasks**

```markdown
Workflow:

1. Read @docs/testing-strategy.md for framework
2. Read relevant implementation docs for context
3. Use Test Engineer sub-agent for comprehensive test development
4. Use Security Expert sub-agent for security test validation
5. Use Performance Specialist sub-agent for performance test analysis
6. Ensure coverage requirements are met
```

### **Performance Optimization Tasks**

```markdown
Workflow:

1. Use UltraThink for performance analysis
2. Read @docs/performance-requirements.md for targets
3. Use Plan Mode for optimization strategy
4. Use Performance Specialist sub-agent for implementation
5. Use benchmarking sub-agent for validation
6. Document performance improvements and trade-offs
```

## Error Recovery Patterns

### **Context Poisoning Recovery**

**Detection Signs:**

- Degraded response quality
- Irrelevant suggestions
- High token consumption without value
- Repetitive or confused responses

**Recovery Actions:**

1. Use `/compact` command to summarize conversation
2. Use `/clear` command for fresh start if needed
3. Reload essential context with explicit file reads
4. Use Plan Mode to refocus on task objectives

### **Sub-Agent Communication Issues**

**Common Problems:**

- Sub-agent tasks too broad or unclear
- Insufficient context provided to sub-agents
- Conflicting recommendations from multiple sub-agents

**Solutions:**

1. Provide specific, focused tasks to sub-agents
2. Include relevant documentation in sub-agent prompts
3. Use sequential rather than parallel sub-agents for conflicting domains
4. Synthesize sub-agent outputs before making decisions

## Quality Assurance Workflows

### **Implementation Quality Gates**

**Security Validation:**

1. Security Expert sub-agent reviews all temp file handling
2. Command injection prevention validation
3. Path traversal attack prevention testing
4. Resource cleanup verification

**Performance Validation:**

1. Performance Specialist sub-agent analyzes implementation
2. Memory usage and resource leak testing
3. Execution time benchmarking
4. Scalability analysis

**Code Quality Validation:**

1. Code Reviewer sub-agent evaluates architecture adherence
2. TypeScript best practices validation
3. Error handling completeness review
4. Documentation accuracy verification

### **Testing Quality Gates**

**Test Coverage:**

- Unit test coverage requirements (>90%)
- Integration test scenario coverage
- Security test implementation
- Performance regression test coverage

**Test Quality:**

- Test readability and maintainability
- Mock strategy appropriateness
- Test data management
- CI/CD integration verification

This workflow guidance ensures systematic, high-quality development while leveraging all Claude Code capabilities for optimal efficiency and outcomes.
