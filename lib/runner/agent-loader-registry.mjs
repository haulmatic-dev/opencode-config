import fs from 'fs/promises';
import yaml from 'js-yaml';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
let registryPromise = null;

async function buildRegistry() {
  const byId = {};
  const byAlias = {};

  const baseDir = path.join(__dirname, '../../agent');
  const files = await fs.readdir(baseDir);

  for (const file of files) {
    if (!file.endsWith('.md')) continue;

    const filePath = path.join(baseDir, file);
    const content = await fs.readFile(filePath, 'utf-8');

    const match = content.match(/^---\n([\s\S]*?)\n---/);
    if (!match) {
      throw new Error(`Agent file ${file} missing YAML frontmatter`);
    }

    const meta = yaml.load(match[1]);
    if (!meta?.id) {
      throw new Error(`Agent file ${file} missing 'id'`);
    }

    if (byId[meta.id]) {
      throw new Error(`Duplicate agent id: ${meta.id}`);
    }

    byId[meta.id] = {
      id: meta.id,
      aliases: meta.aliases || [],
      filePath,
    };

    for (const alias of meta.aliases || []) {
      if (byAlias[alias]) {
        throw new Error(`Alias '${alias}' collision between agents`);
      }
      byAlias[alias] = meta.id;
    }
  }

  return { byId, byAlias };
}

export async function loadAgent(agentId) {
  if (!registryPromise) {
    registryPromise = buildRegistry().catch((error) => {
      registryPromise = null;
      throw error;
    });
  }

  const { byId, byAlias } = await registryPromise;

  const canonicalId = byAlias[agentId] || agentId;
  const agent = byId[canonicalId];

  if (!agent) {
    const availableIds = Object.keys(byId).join(', ');
    const availableAliases = Object.keys(byAlias).join(', ');
    throw new Error(
      `Agent not found: '${agentId}'\n` +
        `Available IDs: ${availableIds}\n` +
        `Available aliases: ${availableAliases}`,
    );
  }

  const content = await fs.readFile(agent.filePath, 'utf-8');
  return parseAgentContent(content, agent);
}

function parseAgentContent(content, agentMeta) {
  const lines = content.split('\n');
  const agent = {
    id: agentMeta.id,
    aliases: agentMeta.aliases,
    persona: '',
    capabilities: [],
    instructions: [],
    metadata: agentMeta,
    fullContent: content,
  };

  let frontmatterEnded = false;
  let inPersona = false;
  let inCapabilities = false;
  let inInstructions = false;
  let personaLines = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.trim() === '---') {
      if (frontmatterEnded) {
        break;
      }
      frontmatterEnded = true;
      continue;
    }

    if (!frontmatterEnded) continue;

    if (line.startsWith('#')) {
      const lowerLine = line.trim().toLowerCase();

      // Check for persona section
      inPersona =
        lowerLine === '## persona' || lowerLine === '## agent persona';

      // Check for capabilities section
      inCapabilities = lowerLine === '## capabilities';

      // Check for instructions section
      inInstructions =
        lowerLine === '## instructions' || lowerLine === '## guidelines';

      // If we're not in a recognized section, stop collecting persona
      if (
        !inPersona &&
        !inCapabilities &&
        !inInstructions &&
        personaLines.length > 0
      ) {
        // Collect all persona text up to this point
        agent.persona = personaLines.join('\n').trim();
        personaLines = [];
      }
      continue;
    }

    // Collect text based on current section
    if (inPersona && line.trim()) {
      agent.persona += (agent.persona ? '\n' : '') + line.trim();
    } else if (inCapabilities && line.trim().startsWith('-')) {
      agent.capabilities.push(line.trim().substring(1).trim());
    } else if (inInstructions && line.trim().startsWith('-')) {
      agent.instructions.push(line.trim().substring(1).trim());
    } else if (
      !inPersona &&
      !inCapabilities &&
      !inInstructions &&
      line.trim()
    ) {
      // Collect text before any section as persona
      personaLines.push(line.trim());
    }
  }

  // If we collected persona text but never hit a section, use it
  if (personaLines.length > 0 && !agent.persona) {
    agent.persona = personaLines.join('\n').trim();
  }

  return agent;
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

export async function reloadRegistry() {
  registryPromise = null;
  console.log('[AgentLoader] Registry reloaded');
}

export function getRegisteredAgents() {
  if (!registryPromise) return [];
  return registryPromise;
}
