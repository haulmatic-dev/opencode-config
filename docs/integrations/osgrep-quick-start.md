# osgrep Integration Quick Start Guide
## Get Up and Running in 10 Minutes

> **Goal**: Rapidly integrate osgrep semantic search into your Factory CLI workflow

---

## ⚡ 5-Minute Installation

```bash
# 1. Install osgrep globally
npm install -g osgrep

# 2. Download embedding models (~150MB, one-time)
osgrep setup

# 3. Verify installation
osgrep doctor
```

**Expected output**:
```
✅ osgrep CLI installed
✅ Embedding models downloaded
✅ Ready for semantic search
```

---

## 🎯 Immediate Usage - No Configuration Needed

### Basic Semantic Search

```bash
# Navigate to any project
cd ~/projects/your-project

# Search by concept (not just keywords)
osgrep "how is user authentication implemented"

# More specific queries
osgrep "database connection pooling" -m 10
osgrep "error handling patterns" --per-file 2
osgrep "API rate limiting logic" -c  # Show full content
```

### Compare: Semantic vs Pattern Search

```bash
# Traditional grep (lots of noise)
grep -r "authentication" .
# Result: 1000+ matches including comments, tests, logs...

# Semantic search (high relevance)
osgrep "authentication implementation"
# Result: 10-15 highly relevant files showing actual auth logic
```

---

## 🚀 10-Minute Enhancement for Research Droids

### Quick Droid Enhancement

Add this prompt guidance to research droids when using them:

**For `codebase-researcher`**:
```
Before traditional grep, try semantic search:
- osgrep "architecture patterns" -m 10
- osgrep "authentication and security" -m 10
- osgrep "database and data layer" -m 10

Then verify with pattern search for precision.
```

**For `file-picker-agent`**:
```
Use hybrid search:
1. Semantic: osgrep "files implementing [feature]" -m 15
2. Pattern: grep/glob for file extensions and exact names
3. Combine results for comprehensive discovery
```

---

## 💡 Common Use Cases - Copy & Paste Ready

### Security Audit
```bash
osgrep "input validation and sanitization" -m 20
osgrep "authentication and authorization" -m 15
osgrep "SQL injection prevention" -m 10
```

### Performance Investigation
```bash
osgrep "database query optimization" -m 10
osgrep "caching mechanisms" -m 10
osgrep "async and parallel processing" -m 10
```

### Bug Investigation
```bash
osgrep "error handling for [specific-error]" -m 10
osgrep "logging and debugging" -m 10
osgrep "validation and data checking" -m 10
```

### Architecture Understanding
```bash
osgrep "main application structure" -m 10
osgrep "routing and navigation" -m 10
osgrep "state management" -m 10
osgrep "API endpoint definitions" -m 10
```

---

## 🔥 Performance Optimization (Optional)

### For Large Projects - Pre-Index & Hot Search

```bash
# One-time index (30-90 seconds for large projects)
cd ~/projects/large-project
osgrep index

# Start background daemon for <50ms searches
osgrep serve &

# Now all searches are instant!
osgrep "query" # <50ms response!

# Stop daemon when done (optional, auto-cleanup on session end)
pkill -f "osgrep serve"
```

### Project-Specific Ignore Patterns

Create `.osgrepignore` in project root:
```gitignore
node_modules/
dist/
build/
*.min.js
coverage/
.next/
```

---

## 📊 Measure Your Improvements

### Quick Benchmark

```bash
# Traditional approach
time (grep -r "authentication" . | wc -l)
# Note the time and count

# Semantic approach
time (osgrep "authentication implementation" -m 10)
# Compare time and relevance
```

### Track Token Savings

**Before osgrep**:
- grep returns 1000 results → send 500 to LLM for filtering → 50K tokens
- Manual filtering required → additional tokens

**After osgrep**:
- osgrep returns 15 relevant results → send 15 to LLM → 10K tokens
- No filtering needed → pure intelligence

**Net savings**: ~20% tokens, ~30% time

---

## 🎓 Learning Path

### Day 1: Basic Usage
- Install and setup
- Try 5-10 semantic queries on a familiar project
- Compare results with traditional grep

### Day 2: Integration
- Use semantic search in manual research tasks
- Note which queries work well semantically
- Identify cases where pattern search is still better

### Day 3: Automation
- Create helper scripts (optional)
- Enhance research droid prompts
- Establish personal semantic search patterns

### Week 1: Mastery
- Develop hybrid search intuition
- Share patterns with team
- Measure and document improvements

---

## 🆘 Quick Troubleshooting

**Issue**: osgrep command not found  
**Solution**: `npm install -g osgrep`

**Issue**: First search is slow  
**Solution**: Expected behavior (model initialization), subsequent searches are fast

**Issue**: Models not found  
**Solution**: Run `osgrep setup` to download

**Issue**: Poor results  
**Solution**: Try more descriptive queries, use hybrid approach with grep

---

## ✅ Success Checklist

After 10 minutes, you should have:
- [ ] osgrep installed and verified
- [ ] Run 3-5 successful semantic searches
- [ ] Compared semantic vs pattern search results
- [ ] Identified 2-3 use cases where semantic search helps
- [ ] Understand when to use semantic vs pattern search

---

## 🚀 Next Steps

**Immediate** (Done!):
- ✅ Installation complete
- ✅ Basic usage validated
- ✅ Improvements identified

**Short Term** (This Week):
- [ ] Create helper scripts (see full integration plan)
- [ ] Enhance research droid configurations
- [ ] Test on real development tasks

**Long Term** (This Month):
- [ ] Update orchestrator with semantic layer
- [ ] Measure and document ROI
- [ ] Share learnings with team

---

## 📚 Full Documentation

For comprehensive integration details, see:
- **Full Integration Plan**: `~/.config/opencode/OSGREP-INTEGRATION-PLAN.md`
- **osgrep GitHub**: https://github.com/Ryandonofrio3/osgrep
- **Research Droids**: `~/.config/opencode/droids/`

---

**Current Status**: Ready for immediate use!  
**Time Investment**: 5 minutes to install, 5 minutes to learn  
**Expected ROI**: 20% token savings, 30% speed improvement  

🎉 **You're ready to start using semantic search in your workflow!**
