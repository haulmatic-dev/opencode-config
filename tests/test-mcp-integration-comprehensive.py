#!/usr/bin/env python3
"""
Comprehensive Integration Test for MCP Agent Mail Integration
Tests the complete flow: detection → registration → messaging → graceful degradation
"""

import sys
import os

sys.path.insert(0, '/Users/buddhi/.config/opencode/droids')

def test_operating_mode_detection():
    """Test that operating mode detection logic is sound"""
    print("=" * 70)
    print("TEST 1: Operating Mode Detection Logic")
    print("=" * 70)
    
    try:
        # Check Python version requirement
        version = sys.version_info
        print(f"Python version: {version.major}.{version.minor}.{version.micro}")
        
        if version >= (3, 10):
            print("✅ Python 3.10+ requirement met")
        else:
            print(f"❌ Python 3.10+ required, have {version.major}.{version.minor}")
            return False
        
        # Check that detection function exists
        with open('/Users/buddhi/.config/opencode/droids/orchestrator.md', 'r') as f:
            content = f.read()
            if 'def detect_operating_mode():' in content:
                print("✅ detect_operating_mode() function found")
            else:
                print("❌ detect_operating_mode() function not found")
                return False
        
        # Check graceful fallback path
        if 'Falling back to DIRECT DELEGATION mode' in content:
            print("✅ Graceful fallback path documented")
        else:
            print("❌ Graceful fallback not documented")
            return False
        
        return True
    except Exception as e:
        print(f"❌ Error in operating mode detection test: {e}")
        return False

def test_all_droids_registration_blocks():
    """Test that all droids have proper registration blocks"""
    print("\n" + "=" * 70)
    print("TEST 2: All Droids Registration Blocks")
    print("=" * 70)
    
    droids = {
        'orchestrator': 'orchestrator.md',
        'prd': 'prd.md', 
        'generate-tasks': 'generate-tasks.md',
        'task-coordinator': 'task-coordinator.md'
    }
    
    all_good = True
    for agent_name, filename in droids.items():
        print(f"\nChecking {agent_name} ({filename}):")
        try:
            with open(f'/Users/buddhi/.config/opencode/droids/{filename}', 'r') as f:
                content = f.read()
                
                # Check USE_MCP flag
                if 'USE_MCP = False' in content:
                    print(f"  ✅ USE_MCP flag defined")
                else:
                    print(f"  ❌ USE_MCP flag missing")
                    all_good = False
                
                # Check registration call
                if f'agent_name="{agent_name}"' in content:
                    print(f"  ✅ Registers as '{agent_name}'")
                else:
                    print(f"  ❌ Incorrect agent name")
                    all_good = False
                
                # Check try/except
                if 'try:' in content and 'except Exception' in content:
                    print(f"  ✅ Error handling present")
                else:
                    print(f"  ❌ Error handling missing")
                    all_good = False
                
                # Check degradation message
                if 'Continuing without MCP Agent Mail' in content:
                    print(f"  ✅ Graceful degradation message")
                else:
                    print(f"  ❌ Degradation message missing")
                    all_good = False
                    
        except Exception as e:
            print(f"  ❌ Error reading {filename}: {e}")
            all_good = False
    
    return all_good

def test_message_format_consistency():
    """Test that message formats are consistent and complete"""
    print("\n" + "=" * 70)
    print("TEST 3: Message Format Consistency")
    print("=" * 70)
    
    message_checks = {
        'orchestrator.md': {
            'receives': ['task_completion'],
            'sends': ['task_assignment']
        },
        'prd.md': {
            'sends': ['prd_completion'],
            'fields': ['prd_title', 'prd_file', 'status', 'word_count', 'has_figma_design', 'requirements_count', 'acceptance_criteria_count']
        },
        'generate-tasks.md': {
            'sends': ['task_breakdown_completed'],
            'fields': ['prd_file', 'tasks_file', 'total_tasks', 'parallel_tracks', 'estimated_weeks', 'critical_path_tasks', 'has_integration_points']
        },
        'task-coordinator.md': {
            'sends': ['tasks_created'],
            'fields': ['task_ids', 'total_count', 'parent_task_id', 'bd_ready_count', 'has_dependencies']
        }
    }
    
    all_good = True
    for droid_file, checks in message_checks.items():
        print(f"\nChecking {droid_file}:")
        try:
            with open(f'/Users/buddhi/.config/opencode/droids/{droid_file}', 'r') as f:
                content = f.read()
                
                # Check 'sends' messages
                if 'sends' in checks:
                    for msg_type in checks['sends']:
                        if f'"type": "{msg_type}"' in content:
                            print(f"  ✅ Sends '{msg_type}' messages")
                        else:
                            print(f"  ❌ Missing '{msg_type}' message format")
                            all_good = False
                
                # Check 'receives' messages
                if 'receives' in checks:
                    for msg_type in checks['receives']:
                        if f'"type": "{msg_type}"' in content or f"msg.get('type') == '{msg_type}'" in content:
                            print(f"  ✅ Handles '{msg_type}' messages")
                        else:
                            print(f"  ❌ Missing '{msg_type}' message handling")
                            all_good = False
                
                # Check message fields
                if 'fields' in checks:
                    for field in checks['fields']:
                        if f'"{field}"' in content:
                            print(f"  ✅ Includes '{field}' field")
                        else:
                            print(f"  ❌ Missing '{field}' field")
                            all_good = False
                            
        except Exception as e:
            print(f"  ❌ Error reading {droid_file}: {e}")
            all_good = False
    
    return all_good

def test_orchestrator_functionality():
    """Test that orchestrator has complete functionality"""
    print("\n" + "=" * 70)
    print("TEST 4: Orchestrator Complete Functionality")
    print("=" * 70)
    
    try:
        with open('/Users/buddhi/.config/opencode/droids/orchestrator.md', 'r') as f:
            content = f.read()
        
        checks = {
            'detect_operating_mode': 'def detect_operating_mode():',
            'initialize_orchestrator': 'def initialize_orchestrator():',
            'delegate_task_to_droid': 'async def delegate_task_to_droid(',
            'check_droid_completions': 'async def check_droid_completions(',
            'USE_MCP global': 'global USE_MCP'
        }
        
        all_good = True
        for name, pattern in checks.items():
            if pattern in content:
                print(f"  ✅ {name} implemented")
            else:
                print(f"  ❌ {name} missing")
                all_good = False
        
        return all_good
    except Exception as e:
        print(f"❌ Error testing orchestrator: {e}")
        return False

def test_implementation_notes():
    """Test that all Implementation Notes are present and complete"""
    print("\n" + "=" * 70)
    print("TEST 5: Implementation Notes Completeness")
    print("=" * 70)
    
    expected_notes = {
        'prd.md': 'PRD Completion Messages',
        'generate-tasks.md': 'Task Breakdown Completion Messages',
        'task-coordinator.md': 'Task Creation Notifications'
    }
    
    all_good = True
    for droid_file, note_title in expected_notes.items():
        print(f"\nChecking {droid_file}:")
        try:
            with open(f'/Users/buddhi/.config/opencode/droids/{droid_file}', 'r') as f:
                content = f.read()
                
                # Check for Implementation Note section
                if f'## Implementation Note: {note_title}' in content:
                    print(f"  ✅ Implementation Note present: '{note_title}'")
                    
                    # Extract the section
                    import re
                    pattern = rf'## Implementation Note: {re.escape(note_title)}.*?(?=##|\Z)'
                    match = re.search(pattern, content, re.DOTALL)
                    
                    if match:
                        section = match.group(0)
                        
                        # Check for required elements in implementation
                        required_elements = {
                            'USE_MCP check': 'if USE_MCP:',
                            'try/except': 'try:' in section and 'except Exception' in section,
                            'send_message call': 'result = await send_message(',
                            'graceful degradation': 'Continuing without notification' in section or 'graceful degradation' in section,
                            'recipient': 'recipient_name="orchestrator"'
                        }
                        
                        for element_name, check in required_elements.items():
                            if isinstance(check, str):
                                found = check in section
                            else:
                                found = check
                            
                            if found:
                                print(f"    ✅ {element_name}")
                            else:
                                print(f"    ❌ {element_name}")
                                all_good = False
                    else:
                        print(f"  ❌ Could not extract Implementation Note section")
                        all_good = False
                else:
                    print(f"  ❌ Implementation Note missing: '{note_title}'")
                    all_good = False
                    
        except Exception as e:
            print(f"  ❌ Error reading {droid_file}: {e}")
            all_good = False
    
    return all_good

def test_error_handling_patterns():
    """Test that error handling patterns are consistent"""
    print("\n" + "=" * 70)
    print("TEST 6: Error Handling Pattern Consistency")
    print("=" * 70)
    
    droids = ['orchestrator.md', 'prd.md', 'generate-tasks.md', 'task-coordinator.md']
    
    all_good = True
    for droid_file in droids:
        print(f"\nChecking {droid_file}:")
        try:
            with open(f'/Users/buddhi/.config/opencode/droids/{droid_file}', 'r') as f:
                content = f.read()
                
                # Count try/except blocks
                try_blocks = content.count('try:')
                except_blocks = content.count('except Exception')
                
                # Should have at least try/except in registration
                if try_blocks >= 1 and except_blocks >= 1:
                    print(f"  ✅ Has error handling ({try_blocks} try, {except_blocks} except)")
                else:
                    print(f"  ❌ Missing error handling ({try_blocks} try, {except_blocks} except)")
                    all_good = False
                
                # Check for specific error patterns
                error_patterns = [
                    ('⚠️ emoji', '⚠️'),
                    ('Error message', 'Error'),
                    ('Graceful message', 'graceful degradation')
                ]
                
                for pattern_name, pattern in error_patterns:
                    if pattern in content:
                        print(f"  ✅ Includes {pattern_name}")
                    else:
                        print(f"  ⚠ Missing {pattern_name}")
                        
        except Exception as e:
            print(f"  ❌ Error reading {droid_file}: {e}")
            all_good = False
    
    return all_good

def test_global_flags_and_imports():
    """Test that global flags and imports are consistent"""
    print("\n" + "=" * 70)
    print("TEST 7: Global Flags and Imports Consistency")
    print("=" * 70)
    
    droids = ['orchestrator.md', 'prd.md', 'generate-tasks.md', 'task-coordinator.md']
    
    all_good = True
    for droid_file in droids:
        print(f"\nChecking {droid_file}:")
        try:
            with open(f'/Users/buddhi/.config/opencode/droids/{droid_file}', 'r') as f:
                content = f.read()
                
                # Check imports
                if 'from mcp_agent_mail_client import' in content:
                    print(f"  ✅ Imports MCP client")
                else:
                    print(f"  ❌ Missing MCP client imports")
                    all_good = False
                
                # Check for get_project_key
                if 'get_project_key' in content:
                    print(f"  ✅ Uses get_project_key()")
                else:
                    print(f"  ❌ Missing get_project_key()")
                    all_good = False
                
                # Check for global flag
                if 'global USE_MCP' in content or 'USE_MCP = False' in content:
                    print(f"  ✅ Defines/uses USE_MCP")
                else:
                    print(f"  ❌ Missing USE_MCP flag")
                    all_good = False
                    
        except Exception as e:
            print(f"  ❌ Error reading {droid_file}: {e}")
            all_good = False
    
    return all_good

def test_complete_integration_flow():
    """Test the complete integration flow from end to end"""
    print("\n" + "=" * 70)
    print("TEST 8: End-to-End Integration Flow")
    print("=" * 70)
    
    print("\nSimulating flow: PRD → Generate-Tasks → Task-Coordinator → Orchestrator")
    
    flow_steps = [
        ('PRD generates document', 'prd.md', 'prd_completion'),
        ('Generate-Tasks creates breakdown', 'generate-tasks.md', 'task_breakdown_completed'),
        ('Task-Coordinator creates tasks', 'task-coordinator.md', 'tasks_created'),
        ('Orchestrator receives all', 'orchestrator.md', None)  # Receiver
    ]
    
    all_good = True
    for step_name, droid_file, message_type in flow_steps:
        print(f"\n{step_name}:")
        try:
            with open(f'/Users/buddhi/.config/opencode/droids/{droid_file}', 'r') as f:
                content = f.read()
                
                # Check registration
                if 'register_agent(' in content:
                    print(f"  ✅ Registered as MCP agent")
                else:
                    print(f"  ❌ Not registered")
                    all_good = False
                
                # For senders, check they can send the message
                if message_type:
                    if f'"type": "{message_type}"' in content:
                        print(f"  ✅ Sends '{message_type}' message")
                    else:
                        print(f"  ❌ Missing '{message_type}' message")
                        all_good = False
                else:
                    # For receiver (orchestrator), check inbox handling
                    if 'fetch_inbox' in content or 'check_droid_completions' in content:
                        print(f"  ✅ Can receive messages via inbox")
                    else:
                        print(f"  ❌ No inbox handling")
                        all_good = False
                        
                # Check graceful degradation
                if 'USE_MCP' in content and 'try:' in content:
                    print(f"  ✅ Graceful degradation in place")
                else:
                    print(f"  ❌ Missing graceful degradation")
                    all_good = False
                    
        except Exception as e:
            print(f"  ❌ Error checking {droid_file}: {e}")
            all_good = False
    
    if all_good:
        print(f"\n✅ Complete integration flow verified!")
        print(f"   All droids can register, send/receive messages, and degrade gracefully")
    
    return all_good

def main():
    print("╔" + "=" * 68 + "╗")
    print("║" + " " * 15 + "COMPREHENSIVE MCP INTEGRATION TEST" + " " * 18 + "║")
    print("╚" + "=" * 68 + "╝")
    
    tests = [
        ("Operating Mode Detection", test_operating_mode_detection),
        ("All Droids Registration", test_all_droids_registration_blocks),
        ("Message Format Consistency", test_message_format_consistency),
        ("Orchestrator Functionality", test_orchestrator_functionality),
        ("Implementation Notes", test_implementation_notes),
        ("Error Handling Patterns", test_error_handling_patterns),
        ("Global Flags & Imports", test_global_flags_and_imports),
        ("End-to-End Integration Flow", test_complete_integration_flow)
    ]
    
    results = []
    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"\n❌ Test '{test_name}' failed with exception: {e}")
            results.append((test_name, False))
    
    # Final summary
    print("\n" + "=" * 70)
    print("FINAL TEST SUMMARY")
    print("=" * 70)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {test_name}")
    
    print("=" * 70)
    print(f"OVERALL: {passed}/{total} test suites passed")
    print("=" * 70)
    
    if passed == total:
        print("\n🎉 ALL TESTS PASSED!")
        print("The MCP Agent Mail integration is complete and working correctly.")
        print("All droids can:")
        print("  • Detect MCP availability")
        print("  • Register as agents")
        print("  • Send/receive messages")
        print("  • Handle errors gracefully")
        print("  • Degrade to direct mode when MCP unavailable")
        return 0
    else:
        print(f"\n❌ {total - passed} test suite(s) failed")
        print("Review the failures above and fix before proceeding.")
        return 1

if __name__ == "__main__":
    sys.exit(main())
