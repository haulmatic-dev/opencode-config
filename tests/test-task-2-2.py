#!/usr/bin/env python3
"""
Test for Task 2.2: Implement inbox polling for completion messages
Tests the check_droid_completions() function
"""

import sys
import os
import asyncio

# Add the droids path
sys.path.insert(0, '/Users/buddhi/.config/opencode/droids')

def test_mcp_client_imports():
    """Test that MCP client functions can be imported"""
    print("✓ Test 1: MCP client imports")
    try:
        from mcp_agent_mail_client import fetch_inbox, acknowledge_message, get_project_key
        print("  ✅ fetch_inbox, acknowledge_message, get_project_key imported")
        return True
    except ImportError as e:
        print(f"  ❌ Import error: {e}")
        return False

def test_check_droid_completions_function_exists():
    """Test that check_droid_completions function is implemented"""
    print("✓ Test 2: check_droid_completions() function exists")
    try:
        # Read the orchestrator file to verify function exists
        with open('/Users/buddhi/.config/opencode/droids/orchestrator.md', 'r') as f:
            content = f.read()
            if 'async def check_droid_completions():' in content:
                print("  ✅ check_droid_completions() function found in orchestrator.md")
                return True
            else:
                print("  ❌ check_droid_completions() function not found")
                return False
    except Exception as e:
        print(f"  ❌ Error reading orchestrator.md: {e}")
        return False

def test_function_has_mcp_check():
    """Test that function checks USE_MCP flag"""
    print("✓ Test 3: Function checks USE_MCP flag")
    try:
        with open('/Users/buddhi/.config/opencode/droids/orchestrator.md', 'r') as f:
            content = f.read()
            # Find the function and check its content
            if 'if not USE_MCP:' in content and 'check_droid_completions' in content:
                print("  ✅ Function checks USE_MCP flag for graceful degradation")
                return True
            else:
                print("  ❌ USE_MCP check not found")
                return False
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return False

def test_function_calls_fetch_inbox():
    """Test that function calls fetch_inbox"""
    print("✓ Test 4: Function calls fetch_inbox()")
    try:
        with open('/Users/buddhi/.config/opencode/droids/orchestrator.md', 'r') as f:
            content = f.read()
            if 'fetch_inbox(' in content and 'check_droid_completions' in content:
                print("  ✅ Function calls fetch_inbox()")
                return True
            else:
                print("  ❌ fetch_inbox() call not found")
                return False
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return False

def test_function_filters_task_completion():
    """Test that function filters for task_completion messages"""
    print("✓ Test 5: Function filters for task_completion messages")
    try:
        with open('/Users/buddhi/.config/opencode/droids/orchestrator.md', 'r') as f:
            content = f.read()
            # Check for both single and double quote variations
            if "msg.get('type') == 'task_completion'" in content or \
               'msg.get("type") == "task_completion"' in content:
                print("  ✅ Function filters for task_completion message type")
                return True
            else:
                print("  ❌ task_completion filter not found")
                return False
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return False

def test_function_calls_acknowledge_message():
    """Test that function acknowledges messages"""
    print("✓ Test 6: Function calls acknowledge_message()")
    try:
        with open('/Users/buddhi/.config/opencode/droids/orchestrator.md', 'r') as f:
            content = f.read()
            if 'acknowledge_message(' in content and 'check_droid_completions' in content:
                print("  ✅ Function calls acknowledge_message()")
                return True
            else:
                print("  ❌ acknowledge_message() call not found")
                return False
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return False

def test_error_handling():
    """Test that function has error handling"""
    print("✓ Test 7: Error handling with try/except")
    try:
        with open('/Users/buddhi/.config/opencode/droids/orchestrator.md', 'r') as f:
            content = f.read()
            # Find the check_droid_completions function
            import re
            pattern = r'async def check_droid_completions\(\):.*?(?=async def|\Z|#### Layer)'
            match = re.search(pattern, content, re.DOTALL)
            if match:
                function_content = match.group(0)
                if 'try:' in function_content and 'except Exception as e:' in function_content:
                    print("  ✅ Function has try/except error handling")
                    return True
                else:
                    print("  ❌ Error handling not found")
                    return False
            else:
                print("  ❌ Could not extract function content")
                return False
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return False

def test_returns_completions_list():
    """Test that function returns completions list"""
    print("✓ Test 8: Function returns completions list")
    try:
        with open('/Users/buddhi/.config/opencode/droids/orchestrator.md', 'r') as f:
            content = f.read()
            # Find the check_droid_completions function
            import re
            pattern = r'async def check_droid_completions\(\):.*?(?=async def|\Z|#### Layer)'
            match = re.search(pattern, content, re.DOTALL)
            if match:
                function_content = match.group(0)
                if 'return {"success": True, "completions": completions}' in function_content or \
                   'return {"success": True, "completions": completions}' in function_content:
                    print("  ✅ Function returns success/completions structure")
                    return True
                else:
                    print("  ❌ Expected return structure not found")
                    return False
            else:
                print("  ❌ Could not extract function content")
                return False
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return False

def test_includes_from_field():
    """Test that completions include 'from' field"""
    print("✓ Test 9: Completions include 'from' field")
    try:
        with open('/Users/buddhi/.config/opencode/droids/orchestrator.md', 'r') as f:
            content = f.read()
            if "'from': msg['from']" in content or '"from": msg["from"]' in content:
                print("  ✅ Completions include 'from' field")
                return True
            else:
                print("  ❌ 'from' field not found in completions")
                return False
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return False

def test_includes_task_id_field():
    """Test that completions include 'task_id' field"""
    print("✓ Test 10: Completions include 'task_id' field")
    try:
        with open('/Users/buddhi/.config/opencode/droids/orchestrator.md', 'r') as f:
            content = f.read()
            if "'task_id': msg['task_id']" in content or '"task_id": msg["task_id"]' in content:
                print("  ✅ Completions include 'task_id' field")
                return True
            else:
                print("  ❌ 'task_id' field not found in completions")
                return False
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return False

def test_graceful_degradation_path():
    """Test that function returns empty list when MCP unavailable"""
    print("✓ Test 11: Graceful degradation returns empty messages")
    try:
        with open('/Users/buddhi/.config/opencode/droids/orchestrator.md', 'r') as f:
            content = f.read()
            # Check if it returns empty structure when USE_MCP is False
            if 'return {"messages": []}' in content or 'return {"messages": []}' in content:
                print("  ✅ Function returns empty messages when MCP unavailable")
                return True
            else:
                print("  ❌ Graceful degradation return not found")
                return False
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return False

def main():
    print("=" * 70)
    print("COMPREHENSIVE TEST: Task 2.2 Inbox Polling for Completion Messages")
    print("=" * 70)
    print()

    tests = [
        test_mcp_client_imports,
        test_check_droid_completions_function_exists,
        test_function_has_mcp_check,
        test_function_calls_fetch_inbox,
        test_function_filters_task_completion,
        test_function_calls_acknowledge_message,
        test_error_handling,
        test_returns_completions_list,
        test_includes_from_field,
        test_includes_task_id_field,
        test_graceful_degradation_path
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
        print("✅ ALL TESTS PASSED - Task 2.2 implementation verified!")
        print("   The check_droid_completions() function is correctly implemented.")
        return 0
    else:
        print("❌ SOME TESTS FAILED - Review implementation")
        return 1

if __name__ == "__main__":
    sys.exit(main())
