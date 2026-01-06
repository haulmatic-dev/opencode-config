#!/usr/bin/env python3
"""
Test for Task 6.1: Add MCP registration to generate-tasks.md
Tests that generate-tasks droid has MCP client integration and registration
"""

import sys
import os

# Add the droids path
sys.path.insert(0, '/Users/buddhi/.config/opencode/droids')

def test_mcp_import_in_generate_tasks():
    """Test that generate-tasks.md imports MCP client"""
    print("✓ Test 1: MCP client import in generate-tasks.md")
    try:
        with open('/Users/buddhi/.config/opencode/droids/generate-tasks.md', 'r') as f:
            content = f.read()
            if 'from mcp_agent_mail_client import register_agent, send_message, get_project_key' in content:
                print("  ✅ MCP client imported in generate-tasks.md")
                return True
            else:
                print("  ❌ MCP client import not found in generate-tasks.md")
                return False
    except Exception as e:
        print(f"  ❌ Error reading generate-tasks.md: {e}")
        return False

def test_use_mcp_flag_in_generate_tasks():
    """Test that generate-tasks.md defines USE_MCP flag"""
    print("✓ Test 2: USE_MCP flag in generate-tasks.md")
    try:
        with open('/Users/buddhi/.config/opencode/droids/generate-tasks.md', 'r') as f:
            content = f.read()
            if 'USE_MCP = False' in content:
                print("  ✅ USE_MCP flag defined in generate-tasks.md")
                return True
            else:
                print("  ❌ USE_MCP flag not found in generate-tasks.md")
                return False
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return False

def test_register_agent_called_in_generate_tasks():
    """Test that register_agent is called in generate-tasks.md"""
    print("✓ Test 3: register_agent() in generate-tasks.md")
    try:
        with open('/Users/buddhi/.config/opencode/droids/generate-tasks.md', 'r') as f:
            content = f.read()
            if 'register_agent(' in content and 'agent_name="generate-tasks"' in content:
                print("  ✅ register_agent() called with correct name")
                return True
            else:
                print("  ❌ register_agent() call not found or incorrect")
                return False
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return False

def test_graceful_degradation_in_generate_tasks():
    """Test graceful degradation in generate-tasks.md"""
    print("✓ Test 4: Graceful degradation in generate-tasks.md")
    try:
        with open('/Users/buddhi/.config/opencode/droids/generate-tasks.md', 'r') as f:
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
        with open('/Users/buddhi/.config/opencode/droids/generate-tasks.md', 'r') as f:
            content = f.read()
            # Check for the Implementation Note section
            import re
            pattern = r'## Implementation Note: Task Breakdown Completion Messages.*?(?=##|\Z)'
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

def test_message_type_task_breakdown_completed():
    """Test that message type is task_breakdown_completed"""
    print("✓ Test 6: Message type is 'task_breakdown_completed'")
    try:
        with open('/Users/buddhi/.config/opencode/droids/generate-tasks.md', 'r') as f:
            content = f.read()
            if '"type": "task_breakdown_completed"' in content or "'type': 'task_breakdown_completed'" in content:
                print("  ✅ Message type is 'task_breakdown_completed'")
                return True
            else:
                print("  ❌ task_breakdown_completed message type not found")
                return False
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return False

def test_recipient_is_orchestrator():
    """Test that recipient is orchestrator"""
    print("✓ Test 7: Recipient is 'orchestrator'")
    try:
        with open('/Users/buddhi/.config/opencode/droids/generate-tasks.md', 'r') as f:
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
        with open('/Users/buddhi/.config/opencode/droids/generate-tasks.md', 'r') as f:
            content = f.read()
            required_fields = ['prd_file', 'tasks_file', 'total_tasks', 'parallel_tracks', 'estimated_weeks', 'critical_path_tasks', 'has_integration_points']
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
        with open('/Users/buddhi/.config/opencode/droids/generate-tasks.md', 'r') as f:
            content = f.read()
            # Find the Implementation Note section
            import re
            pattern = r'## Implementation Note: Task Breakdown Completion Messages.*?(?=##|\Z)'
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
        with open('/Users/buddhi/.config/opencode/droids/generate-tasks.md', 'r') as f:
            content = f.read()
            # Find the Implementation Note section
            import re
            pattern = r'## Implementation Note: Task Breakdown Completion Messages.*?(?=##|\Z)'
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
        with open('/Users/buddhi/.config/opencode/droids/generate-tasks.md', 'r') as f:
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

def test_agent_name_is_generate_tasks():
    """Test that agent_name is generate-tasks"""
    print("✓ Test 12: Agent name is 'generate-tasks'")
    try:
        with open('/Users/buddhi/.config/opencode/droids/generate-tasks.md', 'r') as f:
            content = f.read()
            if 'sender_name="generate-tasks"' in content or "sender_name='generate-tasks'" in content:
                print("  ✅ Sender name is generate-tasks")
                return True
            else:
                print("  ❌ Sender name generate-tasks not found")
                return False
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return False

def main():
    print("=" * 70)
    print("COMPREHENSIVE TEST: Task 6.1 MCP Registration in generate-tasks.md")
    print("=" * 70)
    print()

    tests = [
        test_mcp_import_in_generate_tasks,
        test_use_mcp_flag_in_generate_tasks,
        test_register_agent_called_in_generate_tasks,
        test_graceful_degradation_in_generate_tasks,
        test_send_message_code_present,
        test_message_type_task_breakdown_completed,
        test_recipient_is_orchestrator,
        test_required_fields_present,
        test_use_mcp_check,
        test_error_handling,
        test_graceful_degradation_message,
        test_agent_name_is_generate_tasks
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
        print("✅ ALL TESTS PASSED - Task 6.1 implementation verified!")
        print("   MCP registration correctly added to generate-tasks.md")
        return 0
    else:
        print("❌ SOME TESTS FAILED - Review implementation")
        return 1

if __name__ == "__main__":
    sys.exit(main())
