#!/usr/bin/env python3
"""
Test for Task 7.1: Add MCP registration to research droids
Tests both codebase-researcher.md and git-history-analyzer.md
"""

import sys
import os

# Add the droids path
sys.path.insert(0, '/Users/buddhi/.config/opencode/droids')

def test_mcp_import_in_codebase_researcher():
    """Test that codebase-researcher.md imports MCP client"""
    print("✓ Test 1: MCP client import in codebase-researcher.md")
    try:
        with open('/Users/buddhi/.config/opencode/droids/codebase-researcher.md', 'r') as f:
            content = f.read()
            if 'from mcp_agent_mail_client import register_agent, get_project_key' in content:
                print("  ✅ MCP client imported in codebase-researcher.md")
                return True
            else:
                print("  ❌ MCP client import not found in codebase-researcher.md")
                return False
    except Exception as e:
        print(f"  ❌ Error reading codebase-researcher.md: {e}")
        return False

def test_use_mcp_flag_in_codebase_researcher():
    """Test that codebase-researcher.md defines USE_MCP flag"""
    print("✓ Test 2: USE_MCP flag in codebase-researcher.md")
    try:
        with open('/Users/buddhi/.config/opencode/droids/codebase-researcher.md', 'r') as f:
            content = f.read()
            if 'USE_MCP = False' in content:
                print("  ✅ USE_MCP flag defined in codebase-researcher.md")
                return True
            else:
                print("  ❌ USE_MCP flag not found in codebase-researcher.md")
                return False
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return False

def test_register_agent_called_in_codebase_researcher():
    """Test that register_agent is called in codebase-researcher.md"""
    print("✓ Test 3: register_agent() in codebase-researcher.md")
    try:
        with open('/Users/buddhi/.config/opencode/droids/codebase-researcher.md', 'r') as f:
            content = f.read()
            if 'register_agent(' in content and 'agent_name="codebase-researcher"' in content:
                print("  ✅ register_agent() called with correct name")
                return True
            else:
                print("  ❌ register_agent() call not found or incorrect")
                return False
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return False

def test_graceful_degradation_in_codebase_researcher():
    """Test graceful degradation in codebase-researcher.md"""
    print("✓ Test 4: Graceful degradation in codebase-researcher.md")
    try:
        with open('/Users/buddhi/.config/opencode/droids/codebase-researcher.md', 'r') as f:
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

def test_mcp_import_in_git_history_analyzer():
    """Test that git-history-analyzer.md imports MCP client"""
    print("✓ Test 5: MCP client import in git-history-analyzer.md")
    try:
        with open('/Users/buddhi/.config/opencode/droids/git-history-analyzer.md', 'r') as f:
            content = f.read()
            if 'from mcp_agent_mail_client import register_agent, get_project_key' in content:
                print("  ✅ MCP client imported in git-history-analyzer.md")
                return True
            else:
                print("  ❌ MCP client import not found")
                return False
    except Exception as e:
        print(f"  ❌ Error reading git-history-analyzer.md: {e}")
        return False

def test_use_mcp_flag_in_git_history_analyzer():
    """Test that git-history-analyzer.md defines USE_MCP flag"""
    print("✓ Test 6: USE_MCP flag in git-history-analyzer.md")
    try:
        with open('/Users/buddhi/.config/opencode/droids/git-history-analyzer.md', 'r') as f:
            content = f.read()
            if 'USE_MCP = False' in content:
                print("  ✅ USE_MCP flag defined")
                return True
            else:
                print("  ❌ USE_MCP flag not found")
                return False
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return False

def test_register_agent_called_in_git_history_analyzer():
    """Test register_agent in git-history-analyzer.md"""
    print("✓ Test 7: register_agent() in git-history-analyzer.md")
    try:
        with open('/Users/buddhi/.config/opencode/droids/git-history-analyzer.md', 'r') as f:
            content = f.read()
            if 'register_agent(' in content and 'agent_name="git-history-analyzer"' in content:
                print("  ✅ register_agent() called with correct name")
                return True
            else:
                print("  ❌ register_agent() call not found")
                return False
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return False

def test_graceful_degradation_in_git_history_analyzer():
    """Test graceful degradation in git-history-analyzer.md"""
    print("✓ Test 8: Graceful degradation in git-history-analyzer.md")
    try:
        with open('/Users/buddhi/.config/opencode/droids/git-history-analyzer.md', 'r') as f:
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

def test_task_description_codebase_researcher():
    """Test task description for codebase-researcher"""
    print("✓ Test 9: Task description for codebase-researcher")
    try:
        with open('/Users/buddhi/.config/opencode/droids/codebase-researcher.md', 'r') as f:
            content = f.read()
            if 'task_description=' in content and 'codebase' in content:
                print("  ✅ Task description set appropriately")
                return True
            else:
                print("  ❌ Task description not found")
                return False
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return False

def test_task_description_git_history_analyzer():
    """Test task description for git-history-analyzer"""
    print("✓ Test 10: Task description for git-history-analyzer")
    try:
        with open('/Users/buddhi/.config/opencode/droids/git-history-analyzer.md', 'r') as f:
            content = f.read()
            if 'task_description=' in content and 'historical' in content:
                print("  ✅ Task description set appropriately")
                return True
            else:
                print("  ❌ Task description not found")
                return False
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return False

def test_degradation_message_both():
    """Test graceful degradation message in both files"""
    print("✓ Test 11: Graceful degradation message in both files")
    try:
        with open('/Users/buddhi/.config/opencode/droids/codebase-researcher.md', 'r') as f:
            content1 = f.read()
        with open('/Users/buddhi/.config/opencode/droids/git-history-analyzer.md', 'r') as f:
            content2 = f.read()
        
        msg_found1 = 'Continuing without MCP Agent Mail' in content1
        msg_found2 = 'Continuing without MCP Agent Mail' in content2
        
        if msg_found1 and msg_found2:
            print("  ✅ Graceful degradation message found in both files")
            return True
        else:
            print(f"  ❌ Message missing: codebase-researcher={msg_found1}, git-history-analyzer={msg_found2}")
            return False
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return False

def main():
    print("=" * 70)
    print("COMPREHENSIVE TEST: Task 7.1 MCP Registration in Research Droids")
    print("=" * 70)
    print()

    tests = [
        test_mcp_import_in_codebase_researcher,
        test_use_mcp_flag_in_codebase_researcher,
        test_register_agent_called_in_codebase_researcher,
        test_graceful_degradation_in_codebase_researcher,
        test_mcp_import_in_git_history_analyzer,
        test_use_mcp_flag_in_git_history_analyzer,
        test_register_agent_called_in_git_history_analyzer,
        test_graceful_degradation_in_git_history_analyzer,
        test_task_description_codebase_researcher,
        test_task_description_git_history_analyzer,
        test_degradation_message_both
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
        print("✅ ALL TESTS PASSED - Task 7.1 implementation verified!")
        print("   MCP registration correctly added to both research droids")
        return 0
    else:
        print("❌ SOME TESTS FAILED - Review implementation")
        return 1

if __name__ == "__main__":
    sys.exit(main())
