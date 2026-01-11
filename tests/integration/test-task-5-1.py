#!/usr/bin/env python3
"""
Test for Task 5.1: Add MCP registration to prd.md
Tests that prd droid has MCP client integration and registration
"""

import sys
import os

# Add the droids path
sys.path.insert(0, '/Users/buddhi/.config/opencode/droids')

def test_mcp_import_in_prd():
    """Test that prd.md imports MCP client"""
    print("✓ Test 1: MCP client import in prd.md")
    try:
        with open('/Users/buddhi/.config/opencode/droids/prd.md', 'r') as f:
            content = f.read()
            # Check for import statement
            if 'from mcp_agent_mail_client import register_agent, send_message, get_project_key' in content or \
               'from mcp_agent_mail_client import' in content:
                print("  ✅ MCP client imported in prd.md")
                return True
            else:
                print("  ❌ MCP client import not found in prd.md")
                return False
    except Exception as e:
        print(f"  ❌ Error reading prd.md: {e}")
        return False

def test_use_mcp_flag_in_prd():
    """Test that prd.md defines USE_MCP flag"""
    print("✓ Test 2: USE_MCP flag defined in prd.md")
    try:
        with open('/Users/buddhi/.config/opencode/droids/prd.md', 'r') as f:
            content = f.read()
            # Check for USE_MCP flag
            if 'USE_MCP = False' in content or 'USE_MCP = True' in content:
                print("  ✅ USE_MCP flag defined in prd.md")
                return True
            else:
                print("  ❌ USE_MCP flag not found in prd.md")
                return False
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return False

def test_register_agent_called():
    """Test that register_agent is called in prd.md"""
    print("✓ Test 3: register_agent() called in prd.md")
    try:
        with open('/Users/buddhi/.config/opencode/droids/prd.md', 'r') as f:
            content = f.read()
            # Check for register_agent call
            if 'register_agent(' in content and 'agent_name="prd"' in content:
                print("  ✅ register_agent() called with agent_name='prd'")
                return True
            else:
                print("  ❌ register_agent() call not found or incorrect")
                return False
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return False

def test_graceful_degradation_in_prd():
    """Test that prd.md has graceful degradation"""
    print("✓ Test 4: Graceful degradation in prd.md")
    try:
        with open('/Users/buddhi/.config/opencode/droids/prd.md', 'r') as f:
            content = f.read()
            # Check for try/except around registration
            # Look for the registration block
            import re
            # Find the Session Initialization section
            session_init_pattern = r'### Session Initialization.*?(?=###|\Z)'
            match = re.search(session_init_pattern, content, re.DOTALL)
            if match:
                section = match.group(0)
                if 'try:' in section and 'except Exception as e:' in section:
                    print("  ✅ Graceful degradation with try/except found")
                    return True
                else:
                    print("  ❌ try/except not found in registration block")
                    return False
            else:
                print("  ❌ Session Initialization section not found")
                return False
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return False

def test_graceful_degradation_message():
    """Test that graceful degradation shows appropriate message"""
    print("✓ Test 5: Graceful degradation message in prd.md")
    try:
        with open('/Users/buddhi/.config/opencode/droids/prd.md', 'r') as f:
            content = f.read()
            # Check for degradation message
            if 'Continuing without MCP Agent Mail' in content or 'graceful degradation' in content:
                print("  ✅ Graceful degradation message found")
                return True
            else:
                print("  ❌ Graceful degradation message not found")
                return False
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return False

def test_agent_name_is_prd():
    """Test that agent is registered with correct name"""
    print("✓ Test 6: Agent registered as 'prd'")
    try:
        with open('/Users/buddhi/.config/opencode/droids/prd.md', 'r') as f:
            content = f.read()
            # Check for agent_name="prd"
            if 'agent_name="prd"' in content or "agent_name='prd'" in content:
                print("  ✅ Agent registered with correct name 'prd'")
                return True
            else:
                print("  ❌ Agent name 'prd' not found")
                return False
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return False

def test_task_description_set():
    """Test that task description is set appropriately"""
    print("✓ Test 7: Task description set appropriately")
    try:
        with open('/Users/buddhi/.config/opencode/droids/prd.md', 'r') as f:
            content = f.read()
            # Check for task description related to PRD
            if 'task_description=' in content and ('PRD' in content or 'Product Requirements' in content):
                print("  ✅ Task description set for PRD functionality")
                return True
            else:
                print("  ❌ PRD-related task description not found")
                return False
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return False

def test_success_flag_check():
    """Test that code checks registration success"""
    print("✓ Test 8: Checks registration success flag")
    try:
        with open('/Users/buddhi/.config/opencode/droids/prd.md', 'r') as f:
            content = f.read()
            # Check for success flag check
            if 'if result["success"]:' in content or 'if result.get("success"):' in content:
                print("  ✅ Code checks registration success flag")
                return True
            else:
                print("  ❌ Success flag check not found")
                return False
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return False

def main():
    print("=" * 70)
    print("COMPREHENSIVE TEST: Task 5.1 MCP Registration in prd.md")
    print("=" * 70)
    print()

    tests = [
        test_mcp_import_in_prd,
        test_use_mcp_flag_in_prd,
        test_register_agent_called,
        test_graceful_degradation_in_prd,
        test_graceful_degradation_message,
        test_agent_name_is_prd,
        test_task_description_set,
        test_success_flag_check
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
        print("✅ ALL TESTS PASSED - Task 5.1 implementation verified!")
        print("   MCP registration correctly added to prd.md")
        return 0
    else:
        print("❌ SOME TESTS FAILED - Review implementation")
        print("   Check if MCP registration block is properly added to prd.md")
        return 1

if __name__ == "__main__":
    sys.exit(main())
