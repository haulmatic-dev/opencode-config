#!/usr/bin/env python3
"""
Test for Task 5.2: Add PRD completion message sending
Tests that prd.md has code to send completion messages to orchestrator
"""

import sys
import os

# Add the droids path
sys.path.insert(0, '/Users/buddhi/.config/opencode/droids')

def test_send_message_code_present():
    """Test that send_message code is present in prd.md"""
    print("✓ Test 1: send_message code present in prd.md")
    try:
        with open('/Users/buddhi/.config/opencode/droids/prd.md', 'r') as f:
            content = f.read()
            # Check for the send_message call in the Implementation Note section
            import re
            pattern = r'## Implementation Note: PRD Completion Messages.*?(?=##|\Z)'
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
        print(f"  ❌ Error reading prd.md: {e}")
        return False

def test_message_type_prd_completion():
    """Test that message type is prd_completion"""
    print("✓ Test 2: Message type is 'prd_completion'")
    try:
        with open('/Users/buddhi/.config/opencode/droids/prd.md', 'r') as f:
            content = f.read()
            if '"type": "prd_completion"' in content or "'type': 'prd_completion'" in content:
                print("  ✅ Message type is 'prd_completion'")
                return True
            else:
                print("  ❌ prd_completion message type not found")
                return False
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return False

def test_recipient_is_orchestrator():
    """Test that recipient is orchestrator"""
    print("✓ Test 3: Recipient is 'orchestrator'")
    try:
        with open('/Users/buddhi/.config/opencode/droids/prd.md', 'r') as f:
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
    print("✓ Test 4: Required fields present in message")
    try:
        with open('/Users/buddhi/.config/opencode/droids/prd.md', 'r') as f:
            content = f.read()
            required_fields = ['prd_title', 'prd_file', 'status', 'word_count', 'has_figma_design', 'requirements_count', 'acceptance_criteria_count']
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
    print("✓ Test 5: Checks USE_MCP flag")
    try:
        with open('/Users/buddhi/.config/opencode/droids/prd.md', 'r') as f:
            content = f.read()
            # Find the Implementation Note section
            import re
            pattern = r'## Implementation Note: PRD Completion Messages.*?(?=##|\Z)'
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
    print("✓ Test 6: Error handling with try/except")
    try:
        with open('/Users/buddhi/.config/opencode/droids/prd.md', 'r') as f:
            content = f.read()
            # Find the Implementation Note section
            import re
            pattern = r'## Implementation Note: PRD Completion Messages.*?(?=##|\Z)'
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
    print("✓ Test 7: Graceful degradation message")
    try:
        with open('/Users/buddhi/.config/opencode/droids/prd.md', 'r') as f:
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

def test_sender_name_is_prd():
    """Test that sender_name is prd"""
    print("✓ Test 8: Sender name is 'prd'")
    try:
        with open('/Users/buddhi/.config/opencode/droids/prd.md', 'r') as f:
            content = f.read()
            if 'sender_name="prd"' in content or "sender_name='prd'" in content:
                print("  ✅ Sender name is prd")
                return True
            else:
                print("  ❌ Sender name prd not found")
                return False
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return False

def test_importance_high():
    """Test that importance is set to high"""
    print("✓ Test 9: Importance set to 'high'")
    try:
        with open('/Users/buddhi/.config/opencode/droids/prd.md', 'r') as f:
            content = f.read()
            if 'importance="high"' in content or "importance='high'" in content:
                print("  ✅ Importance set to high")
                return True
            else:
                print("  ❌ Importance high not found")
                return False
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return False

def test_status_field_set():
    """Test that status field is set correctly"""
    print("✓ Test 10: Status field set to 'ready_for_implementation'")
    try:
        with open('/Users/buddhi/.config/opencode/droids/prd.md', 'r') as f:
            content = f.read()
            if '"ready_for_implementation"' in content or "'ready_for_implementation'" in content:
                print("  ✅ Status set to ready_for_implementation")
                return True
            else:
                print("  ❌ Status field not found")
                return False
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return False

def main():
    print("=" * 70)
    print("COMPREHENSIVE TEST: Task 5.2 PRD Completion Message Sending")
    print("=" * 70)
    print()

    tests = [
        test_send_message_code_present,
        test_message_type_prd_completion,
        test_recipient_is_orchestrator,
        test_required_fields_present,
        test_use_mcp_check,
        test_error_handling,
        test_graceful_degradation_message,
        test_sender_name_is_prd,
        test_importance_high,
        test_status_field_set
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
        print("✅ ALL TESTS PASSED - Task 5.2 implementation verified!")
        print("   PRD completion message sending correctly implemented")
        return 0
    else:
        print("❌ SOME TESTS FAILED - Review implementation")
        print("   Check Implementation Note section in prd.md")
        return 1

if __name__ == "__main__":
    sys.exit(main())
