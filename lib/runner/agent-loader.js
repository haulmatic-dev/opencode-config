import { readFile as fsRead } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const AGENT_DIR = resolve(process.cwd(), 'agent');

export async function loadAgent(agentType) {
  try {
    const agentFile = resolve(AGENT_DIR, `${agentType}.md`);
    const content = await fsRead(agentFile, 'utf-8');

    return parseAgentMarkdown(content, agentType);
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.warn(`[AgentLoader] Agent file not found: ${agentType}.md`);
      return null;
    }
    console.error(
      `[AgentLoader] Failed to load agent ${agentType}:`,
      error.message,
    );
    return null;
  }
}

function parseAgentMarkdown(content, agentType) {
  const lines = content.split('\n');
  const agent = {
    name: agentType,
    persona: '',
    instructions: [],
    capabilities: [],
    metadata: {},
    fullContent: content,
  };

  let inPersona = false;
  let inCapabilities = false;
  let inInstructions = false;
  let inFrontmatter = false;
  let frontmatterBuffer = [];
  let currentSection = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.trim() === '---') {
      if (!inFrontmatter && i === 0) {
        inFrontmatter = true;
        frontmatterBuffer = [];
        continue;
      } else if (inFrontmatter) {
        inFrontmatter = false;
        parseFrontmatter(frontmatterBuffer.join('\n'), agent.metadata);
        continue;
      }
    }

    if (inFrontmatter) {
      frontmatterBuffer.push(line);
      continue;
    }

    if (line.startsWith('#')) {
      inPersona = line.toLowerCase().includes('persona');
      inCapabilities = line.toLowerCase().includes('capabilities');
      inInstructions =
        line.toLowerCase().includes('instructions') ||
        line.toLowerCase().includes('guidelines');
      currentSection = line.trim();
      continue;
    }

    if (inPersona && line.trim()) {
      agent.persona += (agent.persona ? '\n' : '') + line.trim();
    }

    if (inCapabilities && line.trim().startsWith('-')) {
      agent.capabilities.push(line.trim().substring(1).trim());
    }

    if (inInstructions && line.trim().startsWith('-')) {
      agent.instructions.push(line.trim().substring(1).trim());
    }
  }

  if (!agent.persona && content.length > 0) {
    const personaMatch = content.match(/## Persona\s*\n([\s\S]*?)(?=##|$)/i);
    if (personaMatch) {
      agent.persona = personaMatch[1].trim();
    }
  }

  if (!agent.persona) {
    const youAreMatch = content.match(/You are.*?specialist.*?\./i);
    if (youAreMatch) {
      agent.persona = youAreMatch[0].trim();
    }
  }

  return agent;
}

function parseFrontmatter(frontmatter, metadata) {
  const lines = frontmatter.split('\n');
  for (const line of lines) {
    const match = line.match(/^\s*(\w+):\s*(.*)$/);
    if (match) {
      metadata[match[1]] = match[2].trim();
    }
  }
}

export async function loadAgentByName(agentName) {
  const mapping = {
    'prd-agent': 'prd',
    'implementation-specialist': 'orchestrator',
    'testing-specialist': 'test-specialist',
    'fixing-specialist': 'fix-specialist',
    'security-specialist': 'adversarial-reviewer',
  };

  const mappedName = mapping[agentName] || agentName;
  return await loadAgent(mappedName);
}

export function formatAgentForPrompt(agent) {
  if (!agent) {
    return '';
  }

  const sections = [];

  if (agent.persona) {
    sections.push(`## Agent Persona\n${agent.persona}`);
  }

  if (agent.capabilities && agent.capabilities.length > 0) {
    sections.push(
      `## Capabilities\n${agent.capabilities.map((c) => `- ${c}`).join('\n')}`,
    );
  }

  if (agent.instructions && agent.instructions.length > 0) {
    sections.push(
      `## Instructions\n${agent.instructions.map((i) => `- ${i}`).join('\n')}`,
    );
  }

  return sections.join('\n\n');
}
