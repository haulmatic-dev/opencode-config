#!/usr/bin/env python3
"""
Complete file reservation workflow example.
Demonstrates: reserve → check conflicts → renew → release
"""

import sys
import asyncio
from datetime import datetime, timedelta

sys.path.insert(0, '/Users/buddhi/.config/opencode/droids')

from mcp_agent_mail_client import (
    register_agent,
    reserve_file_paths,
    release_file_reservations,
    get_project_key
)


class FileReservationWorkflow:
    def __init__(self, mcp_client):
        self.mcp_client = mcp_client
        self.project_key = get_project_key()
        self.agent_name = "reservation-demo"
        
    async def initialize(self):
        """Register as an agent."""
        result = await register_agent(
            mcp_client=self.mcp_client,
            project_key=self.project_key,
            agent_name=self.agent_name,
            model="gpt-4",
            task_description="File reservation workflow demo"
        )
        return result.get("success", False)
    
    async def demonstrate_reservation_workflow(self):
        """
        Demonstrate a complete file reservation workflow:
        1. Check current reservations
        2. Reserve some files
        3. Simulate editing
        4. Renew reservation if needed
        5. Release when done
        """
        print("=" * 60)
        print("File Reservation Workflow Demo")
        print("=" * 60)
        print()
        
        # Step 1: Reserve files for a refactoring task
        print("STEP 1: Reserve files for refactoring")
        print("-" * 60)
        
        files_to_edit = [
            "src/auth/*.py",
            "src/auth/providers/**/*.py",
            "tests/auth/test_*.py"
        ]
        
        print(f"Files to reserve: {files_to_edit}")
        print(f"Agent: {self.agent_name}")
        print(f"Duration: 2 hours")
        print()
        
        result = await reserve_file_paths(
            mcp_client=self.mcp_client,
            project_key=self.project_key,
            agent_name=self.agent_name,
            paths=files_to_edit,
            ttl_seconds=7200,  # 2 hours
            exclusive=False  # Advisory (others can still edit with warning)
        )
        
        if result.get("success"):
            reservation = result["response"]
            print(f"✓ Reservation successful!")
            print(f"  Reserved {len(reservation.get('granted', []))} path(s)")
            
            for granted in reservation.get("granted", []):
                print(f"    - {granted['path_pattern']}")
                print(f"      Expires: {granted['expires_ts']}")
                print(f"      ID: {granted['id']}")
            
            if reservation.get("conflicts"):
                print(f"\n⚠ Conflicts detected:")
                for conflict in reservation["conflicts"]:
                    print(f"    - Path: {conflict['path']}")
                    print(f"      Held by: {conflict.get('holders', [])}")
        else:
            error = result.get("error", "Unknown error")
            print(f"✗ Reservation failed: {error}")
            print("\n⚠ Continuing anyway (file reservations are advisory)")
        
        print()
        
        # Step 2: Simulate editing work
        print("STEP 2: Simulate editing work")
        print("-" * 60)
        print("Status: Editing reserved files...")
        print("        • src/auth/login.py - modified")
        print("        • src/auth/providers/oauth.py - modified")
        print("        • tests/auth/test_login.py - added new tests")
        print()
        
        # Simulate work duration
        await asyncio.sleep(1)
        print("✓ Edits completed")
        print()
        
        # Step 3: Check if reservation needs renewal
        print("STEP 3: Check reservation status")
        print("-" * 60)
        
        # Simulate checking expiration
        time_passed = 90  # minutes
        if time_passed > 60:
            print(f"⚠ {time_passed} minutes have passed")
            print("Reservation may expire soon")
            
            # In a real scenario, you would check the reservation status
            # and renew if needed
            print("→ Consider renewing reservation for more time")
        
        print()
        
        # Step 4: Release reservations
        print("STEP 4: Release reservations (cleanup)")
        print("-" * 60)
        
        result = await release_file_reservations(
            mcp_client=self.mcp_client,
            project_key=self.project_key,
            agent_name=self.agent_name
        )
        
        if result.get("success"):
            released = result["response"].get("released", 0)
            print(f"✓ Released {released} reservation(s)")
        else:
            print(f"⚠ Release failed: {result.get('error')}")
        
        print()
        print("=" * 60)
        print("Workflow complete!")
        print("=" * 60)
    
    async def demonstrate_conflict_scenario(self):
        """
        Demonstrate what happens when two agents try to reserve the same files.
        """
        print()
        print("=" * 60)
        print("Conflict Scenario Demo")
        print("=" * 60)
        print()
        print("Simulating two agents editing the same files simultaneously...")
        print()
        
        # Agent A reserves files
        print("Agent A (you) reserves: src/core/*.py")
        result_a = await reserve_file_paths(
            mcp_client=self.mcp_client,
            project_key=self.project_key,
            agent_name="agent-a",
            paths=["src/core/*.py"],
            ttl_seconds=3600,
            exclusive=False
        )
        
        if result_a.get("success"):
            print("✓ Agent A reservation successful")
        
        print()
        
        # Agent B tries to reserve the same files
        print("Agent B (teammate) tries to reserve: src/core/*.py")
        result_b = await reserve_file_paths(
            mcp_client=self.mcp_client,
            project_key=self.project_key,
            agent_name="agent-b",
            paths=["src/core/*.py"],
            ttl_seconds=3600,
            exclusive=False
        )
        
        if result_b.get("success"):
            reservation = result_b["response"]
            
            if reservation.get("conflicts"):
                print("⚠ Conflict detected!")
                for conflict in reservation["conflicts"]:
                    print(f"    Warning: {conflict['path']} already reserved")
                    print(f"    Current holder(s): {conflict.get('holders', [])}")
                
                print()
                print("Options:")
                print("1. Coordinate with Agent A before editing")
                print("2. Use force_release (not recommended)")
                print("3. Edit anyway (advisory reservations only)")
            else:
                print("✓ Agent B reservation successful (no conflicts)")
        
        print()
        print("=" * 60)


# Example usage
async def main():
    print("\nFile Reservation Workflow Demonstration")
    print("This shows how to properly use file reservations in your workflow.\n")
    
    class MockMCPClient:
        async def call_tool(self, name, arguments):
            tool_name = arguments.get("tool_name", name)
            print(f"   [MCP Call: {tool_name}]")
            
            if tool_name == "reserve_file_paths":
                # Simulate successful reservation
                return {
                    "result": {
                        "granted": [{
                            "id": 123,
                            "path_pattern": arguments["arguments"]["paths"][0],
                            "expires_ts": "2025-12-26T14:00:00Z",
                            "reason": arguments["arguments"].get("reason", "")
                        }],
                        "conflicts": []
                    }
                }
            elif tool_name == "release_file_reservations":
                return {"result": {"released": 1}}
            
            return {"result": {"success": True}}
    
    mcp_client = MockMCPClient()
    workflow = FileReservationWorkflow(mcp_client)
    
    # Initialize
    await workflow.initialize()
    print()
    
    # Run workflow demonstration
    await workflow.demonstrate_reservation_workflow()
    
    # Run conflict scenario
    await workflow.demonstrate_conflict_scenario()
    
    print("\n💡 Key Takeaways:")
    print("   • Always reserve files before editing")
    print("   • Check for conflicts and coordinate with teammates")
    print("   • Release reservations when done")
    print("   • Reservations are advisory (no hard locks)")
    print()


if __name__ == "__main__":
    asyncio.run(main())
