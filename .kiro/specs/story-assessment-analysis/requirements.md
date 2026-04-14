# Story-Based Assessment Analysis - Requirements

## 📋 Overview

Analyze and document the logic for transforming traditional assessment questions into story-based interactive scenarios in the AI Career Recommendation System.

## 🎯 User Stories

### Story 1: Question Transformation Analysis
**As a** technical analyst  
**I want to** understand how traditional RIASEC/Big5 questions are converted to story format  
**So that** I can document the complete transformation logic and flow

**Acceptance Criteria:**
- [ ] Document the complete flow from traditional question → story scenario
- [x] Identify all components involved in the transformation process
- [x] Create transformation framework template
- [ ] Map the data flow between frontend and backend services
- [ ] Analyze the AI/LLM integration for story generation (Gemini API)
- [ ] Document Vietnamese localization in story generation

### Story 2: Branch Comparison Analysis  
**As a** developer  
**I want to** understand differences between "main" and "sach" branches  
**So that** I can identify what changes were made for story-based assessment

**Acceptance Criteria:**
- [ ] Compare file structures between branches
- [ ] Identify new components added for story assessment
- [ ] Document API changes and new endpoints
- [ ] Analyze database schema modifications
- [ ] Compare user experience flows between branches
- [ ] Document performance implications of story generation

### Story 3: Technical Implementation Documentation
**As a** development team member  
**I want to** comprehensive technical documentation of story assessment  
**So that** I can understand and maintain the story-based assessment system

**Acceptance Criteria:**
- [ ] Document all services involved (StoryGeneratorService, etc.)
- [ ] Map component interactions and data flow
- [ ] Identify integration points with Gemini AI
- [ ] Document scoring and response processing logic

## 🔧 Technical Requirements

### Core Components to Analyze
1. **Story Generator Service** - AI-powered story creation
2. **Assessment Flow Controller** - Manages question progression  
3. **Response Processing** - Handles user interactions
4. **Scoring Engine** - Converts story responses to RIASEC/Big5 scores

### Key Files to Examine
- `STORY_ASSESSMENT_GUIDE.md` - User guide and logic explanation
- `INTERACTIVE_ASSESSMENT_SETUP.md` - Technical setup documentation
- Story-related React components
- Backend services for story generation
- Database schema changes

### Analysis Deliverables
1. **Logic Flow Diagram** - Visual representation of transformation process
2. **Technical Architecture** - Component interaction diagram  
3. **API Documentation** - New endpoints and data structures
4. **Comparison Report** - Main vs Sach branch differences

## 📊 Success Metrics

- [ ] Complete understanding of question → story transformation
- [x] Documented all technical components and their roles (framework created)
- [ ] Clear comparison between traditional and story-based approaches
- [ ] Actionable insights for system improvement
- [x] Analysis framework established and ready for implementation
- [ ] Source materials collected and analyzed

## 🚀 Next Steps

1. **Gather Source Materials** - Obtain content from both guide files ⏳
2. **Code Analysis** - Examine relevant components in both branches
3. **Flow Documentation** - Create detailed process flows
4. **Technical Specification** - Document complete system architecture

## 📋 Current Progress

### ✅ Completed
- Requirements specification created
- Transformation framework established
- Data collection template prepared
- Analysis methodology defined

### 🔄 In Progress  
- Waiting for source file contents from "sach" branch
- Ready to begin detailed analysis upon receiving materials

### ⏳ Pending
- Complete logic flow documentation
- Technical architecture analysis
- Branch comparison report
- Implementation recommendations

## 📝 Notes

- Focus on the AI-powered transformation logic using Gemini
- Pay attention to Vietnamese localization aspects
- Consider user experience improvements in story format
- Analyze performance implications of story generation