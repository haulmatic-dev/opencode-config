#!/usr/bin/env python3
"""
Multi-agent coordination example.
Demonstrates: project setup, agent registration, task delegation, and coordination.
"""

import sys
import asyncio
from datetime import datetime

sys.path.insert(0, '/Users/buddhi/.config/opencode/droids')

from mcp_agent_mail_client import (
    ensure_project,
    register_agent,
    send_message,
    fetch_inbox,
    acknowledge_message,
    get_project_key
)


class TeamOrchestrator:
    """
    Orchestrator that coordinates multiple specialist agents for a complex feature.
    """
    
    def __init__(self, mcp_client):
        self.mcp_client = mcp_client
        self.project_key = None
        self.agent_name = "feature-orchestrator"
        self.team = {
            "frontend": "frontend-specialist",
            "backend": "backend-specialist",
            "design": "design-extractor",
            "qa": "test-automator"
        }
    
    async def setup_project(self, project_name):
        """
        Ensure the project exists in MCP Agent Mail.
        
        Args:
            project_name: Human-readable project name
        """
        print("=" * 70)
        print("Project Setup")
        print("=" * 70)
        
        result = await ensure_project(
            mcp_client=self.mcp_client,
            human_key=project_name
        )
        
        if result.get("success"):
            project = result["response"]
            self.project_key = project["human_key"]
            print(f"✓ Project ready: {project['slug']}")
            print(f"  Key: {self.project_key}")
            print(f"  Created: {project['created_at']}")
        else:
            raise Exception(f"Failed to setup project: {result.get('error')}")
        
        return self.project_key
    
    async def register_team(self):
        """Register all agents in the team."""
        print()
        print("=" * 70)
        print("Registering Team Agents")
        print("=" * 70)
        
        # Register orchestrator
        print(f"\nRegistering orchestrator: {self.agent_name}")
        result = await register_agent(
            mcp_client=self.mcp_client,
            project_key=self.project_key,
            agent_name=self.agent_name,
            model="gpt-4",
            task_description="Coordinates feature development across specialists"
        )
        
        if result.get("success"):
            print(f"✓ {self.agent_name} registered")
        
        # Register specialists
        for specialty, agent_name in self.team.items():
            print(f"\nRegistering {specialty} specialist: {agent_name}")
            
            result = await register_agent(
                mcp_client=self.mcp_client,
                project_key=self.project_key,
                agent_name=agent_name,
                model="gpt-4",
                task_description=f"Specializes in {specialty} development"
            )
            
            if result.get("success"):
                agent_info = result["response"]
                print(f"✓ {agent_name} registered")
                print(f"  Inception: {agent_info['inception_ts']}")
    
    async def coordinate_feature(self, feature_id, feature_spec):
        """
        Coordinate work on a complex feature across multiple specialists.
        
        Args:
            feature_id: Feature identifier (e.g., "feat-123")
            feature_spec: Complete feature specification
        """
        print()
        print("=" * 70)
        print("Feature Coordination Plan")
        print("=" * 70)
        print()
        print(f"Feature: {feature_spec['name']}")
        print(f"ID: {feature_id}")
        print(f"Description: {feature_spec['description']}")
        print()
        
        # Decompose feature into subtasks
        tasks = feature_spec["tasks"]
        print(f"Coordinating {len(tasks)} tasks across {len(self.team)} specialists")
        print()
        
        # Step 1: Design phase
        if "design" in tasks:
            print("→ STEP 1: Design Phase")
            await self._delegate_task(
                task_id=f"{feature_id}-design",
                description=f"Design UI/UX for: {feature_spec['name']}",
                specialist=self.team["design"],
                files=["design/wireframes/*", "design/prototypes/*"],
                priority="high",
                dependencies=[]
            )
            print()
            # Wait for design completion before proceeding
            print("⏳ Waiting for design completion...")
            await asyncio.sleep(1)
        
        # Step 2: Backend development
        if "backend" in tasks:
            print("→ STEP 2: Backend Development")
            backend_deps = [f"{feature_id}-design"] if "design" in tasks else []
            await self._delegate_task(
                task_id=f"{feature_id}-backend",
                description=f"Implement backend API for: {feature_spec['name']}",
                specialist=self.team["backend"],
                files=["src/api/**/*.py", "src/models/**/*.py"],
                priority="high",
                dependencies=backend_deps
            )
            print()
        
        # Step 3: Frontend development (can start after backend API is defined)
        if "frontend" in tasks:
            print("→ STEP 3: Frontend Development")
            frontend_deps = [f"{feature_id}-backend"] if "backend" in tasks else []
            await self._delegate_task(
                task_id=f"{feature_id}-frontend",
                description=f"Implement frontend UI for: {feature_spec['name']}",
                specialist=self.team["frontend"],
                files=["src/frontend/**/*"],
                priority="high",
                dependencies=frontend_deps
            )
            print()
        
        # Step 4: QA and testing (can run in parallel with development)
        if "qa" in tasks:
            print("→ STEP 4: QA and Testing")
            qa_deps = [f"{feature_id}-backend", f"{feature_id}-frontend"]
            await self._delegate_task(
                task_id=f"{feature_id}-qa",
                description=f"Test and validate: {feature_spec['name']}",
                specialist=self.team["qa"],
                files=["tests/**/*", "test-results/**/*"],
                priority="normal",
                dependencies=qa_deps
            )
            print()
        
        print("=" * 70)
        print("All tasks delegated! Team is now working in parallel.")
        print("Use fetch_inbox() to monitor progress and receive completion reports.")
        print("=" * 70)
    
    async def _delegate_task(self, task_id, description, specialist, files, priority,
                           dependencies):
        """Delegate a single task to a specialist."""
        print(f"Task: {task_id}")
        print(f"  Assigned to: {specialist}")
        print(f"  Files: {', '.join(files[:3])}{'...' if len(files) > 3 else ''}")
        print(f"  Priority: {priority}")
        print(f"  Dependencies: {', '.join(dependencies) if dependencies else 'None'}")
        
        message_content = {
            "version": "1.0.0",
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "sender_id": self.agent_name,
            "message_id": f"msg-{task_id}",
            "type": "task_assignment",
            "task_id": task_id,
            "description": description,
            "file_patterns": files,
            "priority": priority,
            "dependencies": dependencies
        }
        
        result = await send_message(
            mcp_client=self.mcp_client,
            project_key=self.project_key,
            sender_name=self.agent_name,
            recipient_name=specialist,
            content=message_content,
            importance=priority
        )
        
        if result.get("success"):
            print(f"  ✓ Delegated")
        else:
            print(f"  ✗ Failed: {result.get('error')}")
    
    async def monitor_progress(self, duration_seconds=30):
        """
        Monitor team progress for a duration.
        
        Args:
            duration_seconds: How long to monitor (default: 30s)
        """
        print()
        print("=" * 70)
        print("Monitoring Team Progress")
        print("=" * 70)
        print(f"Duration: {duration_seconds} seconds")
        print()
        
        start_time = asyncio.get_event_loop().time()
        
        while (asyncio.get_event_loop().time() - start_time) < duration_seconds:
            await self._check_team_updates()
            await asyncio.sleep(5)
        
        print()
        print("Monitoring complete!")
    
    async def _check_team_updates(self):
        """Check inbox for updates from the team."""
        result = await fetch_inbox(
            mcp_client=self.mcp_client,
            project_key=self.project_key,
            agent_name=self.agent_name,
            limit=20,
            acknowledged_only=False
        )
        
        if not result.get("success"):
            return
        
        messages = result["response"].get("messages", [])
        
        if not messages:
            return
        
        print(f"📥 New updates ({len(messages)} message(s)):")
        
        for msg in messages:
            await self._process_team_update(msg)
    
    async def _process_team_update(self, msg):
        """Process an update from a team member."""
        subject = msg.get("subject", "")
        sender = msg.get("from", "")
        content = msg.get("content", "")
        
        # Simple classification based on content
        if "completed" in content.lower():
            status = "✅ COMPLETED"
        elif "progress" in content.lower():
            status = "📊 IN PROGRESS"
        elif "blocked" in content.lower() or "need help" in content.lower():
            status = "🚨 NEEDS ATTENTION"
        else:
            status = "💬 UPDATE"
        
        print(f"\n  [{status}] {sender}")
        print(f"    Subject: {subject}")
        print(f"    Time: {msg['created_ts'][:19]}")
        
        # Acknowledge the update
        await acknowledge_message(
            mcp_client=self.mcp_client,
            project_key=self.project_key,
            agent_name=self.agent_name,
            message_id=msg["id"]
        )
        print(f"    ✓ Acknowledged")


# Example usage
async def main():
    print("\n" + "=" * 70)
    print("Multi-Agent Coordination Demo")
    print("=" * 70)
    print()
    
    class MockMCPClient:
        async def call_tool(self, name, arguments):
            tool_name = arguments.get("tool_name", name)
            print(f"   [MCP Call: {tool_name}]")
            
            if tool_name == "ensure_project":
                return {
                    "result": {
                        "slug": "user-auth-feature",
                        "human_key": "/Users/buddhi/projects/auth-feature",
                        "created_at": "2025-12-26T10:00:00Z"
                    }
                }
            
            return {"result": {"success": True}}
    
    mcp_client = MockMCPClient()
    coordinator = TeamOrchestrator(mcp_client)
    
    # Setup project and register team
    project_name = "/Users/buddhi/projects/auth-feature"
    await coordinator.setup_project(project_name)
    await coordinator.register_team()
    
    # Define feature specification
    feature_spec = {
        "name": "User Authentication with Social Login",
        "description": "Add OAuth login with GitHub and Google",
        "tasks": {
            "design": True,
            "backend": True,
            "frontend": True,
            "qa": True
        }
    }
    
    # Coordinate feature development
    await coordinator.coordinate_feature(
        feature_id="feat-auth-001",
        feature_spec=feature_spec
    )
    
    # Monitor progress for a few seconds
    await coordinator.monitor_progress(duration_seconds=5)
    
    print()
    print("=" * 70)
    print("\n💡 Key Takeaways:")
    print("   • Complex features require coordination across multiple specialists")
    print("   • Dependencies determine the order of task execution")
    print("   • Some tasks can run in parallel (backend and design)")
    print("   • Monitoring progress helps identify blockers early")
    print()


if __name__ == "__main__":
    asyncio.run(main())
