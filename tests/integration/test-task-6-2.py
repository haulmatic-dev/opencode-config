#!/usr/bin/env python3
"""
Test for Task 6.2: Add MCP registration to task-coordinator.md
Tests that task-coordinator droid has MCP client integration and registration
"""

import sys
import os

# Add the droids path
sys.path.insert(0, '/Users/buddhi/.config/opencode/droids')

def test_mcp_import_in_task_coordinator():
    """Test that task-coordinator.md imports MCP client"""
    print("✓ Test 1: MCP client import in task-coordinator.md")
    try:
        with open('/Users/buddhi/.config/opencode/droids/task-coordinator.md', 'r') as f:
            content = f.read()
            if 'from mcp_agent_mail_client import register_agent, send_message, get_project_key' in content:
                print("  ✅ MCP client imported in task-coordinator.md")
                return True
            else:
                print("  ❌ MCP client import not found in task-coordinator.md")
                return False
    except Exception as e:
        print(f"  ❌ Error reading task-coordinator.md: {e}")
        return False

def test_use_mcp_flag_in_task_coordinator():
    """Test that task-coordinator.md defines USE_MCP flag"""
    print("✓ Test 2: USE_MCP flag in task-coordinator.md")
    try:
        with open('/Users/buddhi/.config/opencode/droids/task-coordinator.md', 'r') as f:
            content = f.read()
            if 'USE_MCP = False' in content:
                print("  ✅ USE_MCP flag defined in task-coordinator.md")
                return True
            else:
                print("  ❌ USE_MCP flag not found in task-coordinator.md")
                return False
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return False

def test_register_agent_called_in_task_coordinator():
    """Test that register_agent is called in task-coordinator.md"""
    print("✓ Test 3: register_agent() in task-coordinator.md")
    try:
        with open('/Users/buddhi/.config/opencode/droids/task-coordinator.md', 'r') as f:
            content = f.read()
            if 'register_agent(' in content and 'agent_name="task-coordinator"' in content:
                print("  ✅ register_agent() called with correct name")
                return True
            else:
                print("  ❌ register_agent() call not found or incorrect")
                return False
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return False

def test_graceful_degradation_in_task_coordinator():
    """Test graceful degradation in task-coordinator.md"""
    print("✓ Test 4: Graceful degradation in task-coordinator.md")
    try:
        with open('/Users/buddhi/.config/opencode/droids/task-coordinator.md', 'r') as f:
            content = f.read()
            if 'try:' in content and 'except Exception as e:' in content:
                print("  ✅ Graceful degradation with try/except found")
                return True
            else:
                print("  ❌ try/except not found")
                return False
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return False

def test_send_message_code_present():
    """Test that send_message code is present"""
    print("✓ Test 5: send_message code in Implementation Note")
    try:
        with open('/Users/buddhi/.config/opencode/droids/task-coordinator.md', 'r') as f:
            content = f.read()
            # Check for the Implementation Note section
            import re
            pattern = r'## Implementation Note: Task Creation Notifications.*?(?=##|\Z)'
            match = re.search(pattern, content, re.DOTALL)
            if match:
                section = match.group(0)
                if 'result = await send_message(' in section:
                    print("  ✅ send_message() call found in Implementation Note")
                    return True
                else:
                    print("  ❌ send_message() call not found in Implementation Note")
                    return False
            else:
                print("  ❌ Implementation Note section not found")
                return False
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return False

def test_message_type_tasks_created():
    """Test that message type is tasks_created"""
    print("✓ Test 6: Message type is 'tasks_created'")
    try:
        with open('/Users/buddhi/.config/opencode/droids/task-coordinator.md', 'r') as f:
            content = f.read()
            if '"type": "tasks_created"' in content or "'type': 'tasks_created'" in content:
                print("  ✅ Message type is 'tasks_created'")
                return True
            else:
                print("  ❌ tasks_created message type not found")
                return False
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return False

def test_recipient_is_orchestrator():
    """Test that recipient is orchestrator"""
    print("✓ Test 7: Recipient is 'orchestrator'")
    try:
        with open('/Users/buddhi/.config/opencode/droids/task-coordinator.md', 'r') as f:
            content = f.read()
            if 'recipient_name="orchestrator"' in content or "recipient_name='orchestrator'" in content:
                print("  ✅ Recipient is orchestrator")
                return True
            else:
                print("  ❌ Recipient orchestrator not found")
                return False
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return False

def test_required_fields_present():
    """Test that all required fields are present in message"""
    print("✓ Test 8: Required fields present in message")
    try:
        with open('/Users/buddhi/.config/opencode/droids/task-coordinator.md', 'r') as f:
            content = f.read()
            required_fields = ['task_ids', 'total_count', 'parent_task_id', 'bd_ready_count', 'has_dependencies']
            missing = []
            for field in required_fields:
                if f'"{field}"' not in content and f"'{field}'" not in content:
                    missing.append(field)
            
            if not missing:
                print(f"  ✅ All required fields present: {', '.join(required_fields)}")
                return True
            else:
                print(f"  ❌ Missing fields: {', '.join(missing)}")
                return False
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return False

def test_use_mcp_check():
    """Test that code checks USE_MCP flag"""
    print("✓ Test 9: Checks USE_MCP flag")
    try:
        with open('/Users/buddhi/.config/opencode/droids/task-coordinator.md', 'r') as f:
            content = f.read()
            # Find the Implementation Note section
            import re
            pattern = r'## Implementation Note: Task Creation Notifications.*?(?=##|\Z)'
            match = re.search(pattern, content, re.DOTALL)
            if match:
                section = match.group(0)
                if 'if USE_MCP:' in section:
                    print("  ✅ Code checks USE_MCP flag")
                    return True
                else:
                    print("  ❌ USE_MCP check not found")
                    return False
            else:
                print("  ❌ Implementation Note section not found")
                return False
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return False

def test_error_handling():
    """Test that code has error handling"""
    print("✓ Test 10: Error handling with try/except")
    try:
        with open('/Users/buddhi/.config/opencode/droids/task-coordinator.md', 'r') as f:
            content = f.read()
            # Find the Implementation Note section
            import re
            pattern = r'## Implementation Note: Task Creation Notifications.*?(?=##|\Z)'
            match = re.search(pattern, content, re.DOTALL)
            if match:
                section = match.group(0)
                if 'try:' in section and 'except Exception as e:' in section:
                    print("  ✅ Error handling with try/except found")
                    return True
                else:
                    print("  ❌ try/except not found")
                    return False
            else:
                print("  ❌ Implementation Note section not found")
                return False
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return False

def test_graceful_degradation_message():
    """Test that graceful degradation message is present"""
    print("✓ Test 11: Graceful degradation message")
    try:
        with open('/Users/buddhi/.config/opencode/droids/task-coordinator.md', 'r') as f:
            content = f.read()
            if 'Continuing without notification' in content or 'graceful degradation' in content:
                print("  ✅ Graceful degradation message found")
                return True
            else:
                print("  ❌ Graceful degradation message not found")
                return False
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return False

def test_agent_name_is_task_coordinator():
    """Test that agent_name is task-coordinator"""
    print("✓ Test 12: Agent name is 'task-coordinator'")
    try:
        with open('/Users/buddhi/.config/opencode/droids/task-coordinator.md', 'r') as f:
            content = f.read()
            if 'sender_name="task-coordinator"' in content or "sender_name='task-coordinator'" in content:
                print("  ✅ Sender name is task-coordinator")
                return True
            else:
                print("  ❌ Sender name task-coordinator not found")
                return False
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return False

def test_importance_normal():
    """Test that importance is set to normal"""
    print("✓ Test 13: Importance set to 'normal'")
    try:
        with open('/Users/buddhi/.config/opencode/droids/task-coordinator.md', 'r') as f:
            content = f.read()
            if 'importance="normal"' in content or "importance='normal'" in content:
                print("  ✅ Importance set to normal")
                return True
            else:
                print("  ❌ Importance normal not found")
                return False
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return False

def main():
    print("=" * 70)
    print("COMPREHENSIVE TEST: Task 6.2 MCP Registration in task-coordinator.md")
    print("=" * 70)
    print()

    tests = [
        test_mcp_import_in_task_coordinator,
        test_use_mcp_flag_in_task_coordinator,
        test_register_agent_called_in_task_coordinator,
        test_graceful_degradation_in_task_coordinator,
        test_send_message_code_present,
        test_message_type_tasks_created,
        test_recipient_is_orchestrator,
        test_required_fields_present,
        test_use_mcp_check,
        test_error_handling,
        test_graceful_degradation_message,
        test_agent_name_is_task_coordinator,
        test_importance_normal
    ]

    results = []
    for test in tests:
        try:
            result = test()
            results.append(result)
        except Exception as e:
            print(f"  ❌ Test failed with exception: {e}")
            results.append(False)
        print()

    # Summary
    passed = sum(results)
    total = len(results)
    print("=" * 70)
    print(f"TEST SUMMARY: {passed}/{total} tests passed")
    print("=" * 70)

    if passed == total:
        print("✅ ALL TESTS PASSED - Task 6.2 implementation verified!")
        print("   MCP registration correctly added to task-coordinator.md")
        return 0
    else:
        print("❌ SOME TESTS FAILED - Review implementation")
        return 1

if __name__ == "__main__":
    sys.exit(main())
