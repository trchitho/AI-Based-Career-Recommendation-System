# Story Assessment Components Analysis

## Overview

This document identifies and analyzes all components involved in the transformation process from traditional assessment questions to story-based interactive scenarios in the AI Career Recommendation System.

## Component Architecture

### 1. Frontend Components

#### 1.1 Assessment UI Components
- **Location**: `apps/frontend/src/components/assessment/`
- **Key Files**:
  - `StoryBasedAssessment.tsx` - Main story-based assessment component
  - `BookStyleAssessment.tsx` - Book-style flipbook interface
  - `InteractiveScenarioAssessment.tsx` - Interactive scenario handler
  - `EnhancedAssessmentFlow.tsx` - Assessment flow controller
  - `DemoEnhancedAssessment.tsx` - Demo version with mock data

#### 1.2 Story Generation Services (Frontend)
- **Location**: `apps/frontend/src/services/`
- **Key Files**:
  - `storyGeneratorService.ts` - Frontend story generation service
  - `geminiService.ts` - Gemini AI integration service
  - `assessmentService.ts` - Assessment data retrieval service

#### 1.3 UI Libraries & Dependencies
- **HTMLFlipBook** (`react-pageflip`) - Book-style page flipping interface
- **React Hooks** - State management for assessment flow
- **CSS Animations** - Story presentation and transitions

### 2. Backend Components

#### 2.1 API Endpoints
- **Location**: `apps/backend/app/modules/assessments/`
- **Key Files**:
  - `routes_assessments.py` - Assessment API routes including `/generate-story`
  - **Endpoint**: `POST /api/assessments/generate-story`
    - Receives question groups
    - Calls story generation service
    - Returns story scenarios

#### 2.2 Story Generation Service (Backend)
- **Location**: `apps/backend/app/modules/assessment/`
- **Key Files**:
  - `story_generator.py` - Backend story generation using Gemini AI
  - **Class**: `StoryGeneratorService`
    - Initializes Gemini AI models
    - Generates group stories (5 questions per group)
    - Provides fallback scenarios

#### 2.3 Assessment Data Services
- **Location**: `apps/backend/app/services/`
- **Key Files**:
  - `ai_client.py` - AI service integration
  - Assessment question retrieval from database

### 3. AI Core Components

#### 3.1 NLP Processing
- **Location**: `packages/ai-core/src/ai_core/nlp/`
- **Key Files**:
  - `essay_infer.py` - Essay analysis and trait extraction
  - `featurize.py` - Feature extraction from text
  - `encode_text_to_vector.py` - Text to vector conversion

#### 3.2 Trait Processing
- **Location**: `packages/ai-core/src/ai_core/traits/`
- **Key Files**:
  - `loader.py` - Loads and processes RIASEC/Big Five traits
  - **Class**: `AssessmentSnapshot` - Trait and embedding data structure

#### 3.3 Models
- **Location**: `packages/ai-core/models/`
- **Key Directories**:
  - `riasec_phobert/` - RIASEC trait extraction model
  - `big5_phobert/` - Big Five trait extraction model
  - `vi_sbert_768/` - Vietnamese sentence embeddings

### 4. External AI Services

#### 4.1 Google Gemini AI
- **Models Used**:
  - `gemma-3-4b-it` (Primary)
  - `gemini-1.5-flash` (Fallback)
  - `gemini-pro` (Legacy)
- **Purpose**: Story scenario generation from traditional questions

#### 4.2 PhoBERT Models
- **Purpose**: Vietnamese text processing and trait extraction
- **Integration**: Through Hugging Face transformers

### 5. Database Components

#### 5.1 Question Storage
- **Tables**:
  - `core.assessments` - Assessment records
  - Question tables (RIASEC/Big Five questions)
- **Data Flow**: Questions → Story Generation → User Responses

#### 5.2 Embedding Storage
- **Tables**:
  - `ai.user_embeddings` - User text embeddings
- **Technology**: pgvector extension for vector storage

## Transformation Process Flow

### Phase 1: Question Retrieval
1. **Frontend Request**: `assessmentService.getQuestions()`
2. **Backend Processing**: Retrieve questions from database
3. **Question Mixing**: Combine RIASEC (24 questions) + Big Five (20 questions)
4. **Shuffling**: Random selection of 30 questions for story flow

### Phase 2: Story Generation
1. **Grouping**: Questions grouped into batches of 5
2. **AI Processing**: Each group sent to Gemini AI via `StoryGeneratorService`
3. **Prompt Engineering**: Structured prompts for Vietnamese story generation
4. **Response Parsing**: JSON parsing of AI-generated scenarios
5. **Fallback Handling**: Predefined scenarios if AI fails

### Phase 3: Story Presentation
1. **UI Rendering**: `StoryBasedAssessment` component renders flipbook
2. **Interactive Elements**: Page-by-page story progression
3. **Response Collection**: User choices mapped to trait scores
4. **Progress Tracking**: Visual progress indicators

### Phase 4: Response Processing
1. **Data Collection**: User responses collected per question
2. **Trait Calculation**: Responses mapped to RIASEC/Big Five scores
3. **Career Matching**: Scores used for career recommendations
4. **Result Storage**: Assessment results saved to database

## Key Transformation Logic

### Story Generation Prompt Structure
```
NHIỆM VỤ: Tạo một câu chuyện liên kết cho nhóm 5 câu hỏi sau
YÊU CẦU:
1. Tạo một bối cảnh chung (scenario) cho cả nhóm 5 câu hỏi
2. Mỗi câu hỏi là một phần của câu chuyện đó
3. Câu chuyện phải mạch lạc, liên kết với nhau
4. Sử dụng ngôn ngữ Việt Nam tự nhiên, thân thiện
5. Tạo cảm giác như người dùng đang trải nghiệm một tình huống thực tế
```

### Fallback Scenarios by Dimension
- **Realistic**: 🔧 Technical Workshop scenarios
- **Investigative**: 🔬 Research Lab scenarios  
- **Artistic**: 🎨 Creative Studio scenarios
- **Social**: 🤝 Community Center scenarios
- **Enterprising**: 💼 Business Office scenarios
- **Conventional**: 📊 Data Analysis scenarios

### Response Mapping
- **Scale**: 1-5 Likert scale
- **Labels**: "Not Me" → "Totally Me!"
- **Processing**: Direct mapping to trait scores

## Integration Points

### Frontend ↔ Backend
- **API Endpoint**: `/api/assessments/generate-story`
- **Data Format**: JSON with question groups and story scenarios
- **Error Handling**: Graceful fallback to predefined scenarios

### Backend ↔ AI Services
- **Gemini API**: Direct HTTP calls for story generation
- **Model Selection**: Automatic fallback through model hierarchy
- **Rate Limiting**: Batch processing with delays

### AI Core ↔ Database
- **Trait Loading**: `AssessmentSnapshot` for user data
- **Embedding Storage**: pgvector for semantic search
- **Score Calculation**: RIASEC/Big Five trait computation

## Performance Considerations

### Story Generation
- **Batch Size**: 5 questions per AI call
- **Delay**: 1.5s between batches to avoid rate limits
- **Caching**: Frontend caching of generated stories
- **Timeout**: Fallback scenarios for failed generations

### UI Performance
- **Lazy Loading**: Components loaded on demand
- **Animation Optimization**: CSS transforms for smooth transitions
- **Memory Management**: Cleanup of unused story data

## Error Handling & Fallbacks

### AI Service Failures
1. **Primary**: Gemini AI story generation
2. **Fallback**: Predefined story templates
3. **Graceful Degradation**: Original questions if all fails

### Network Issues
1. **Retry Logic**: Automatic retry for failed requests
2. **Offline Mode**: Cached stories for offline use
3. **User Feedback**: Clear error messages and alternatives

## Security & Privacy

### API Security
- **Authentication**: User tokens for API access
- **Rate Limiting**: Prevent abuse of AI services
- **Input Validation**: Sanitize all user inputs

### Data Privacy
- **Anonymization**: No PII in story generation
- **Encryption**: Secure transmission of assessment data
- **Retention**: Controlled data lifecycle management

## Monitoring & Analytics

### Performance Metrics
- **Story Generation Success Rate**: AI vs Fallback usage
- **Response Times**: End-to-end assessment completion
- **User Engagement**: Story completion rates

### Quality Metrics
- **Story Relevance**: User feedback on story quality
- **Trait Accuracy**: Validation of transformed questions
- **Career Match Quality**: Recommendation effectiveness

## Future Enhancements

### Planned Improvements
1. **Multi-language Support**: English story generation
2. **Advanced Personalization**: User history-based stories
3. **Interactive Branching**: Dynamic story paths
4. **Voice Integration**: Audio narration support
5. **VR/AR Integration**: Immersive story experiences

### Technical Debt
1. **Code Consolidation**: Merge duplicate story services
2. **Type Safety**: Improve TypeScript coverage
3. **Testing**: Comprehensive test suite for story generation
4. **Documentation**: API documentation for story endpoints

## Conclusion

The story-based assessment transformation involves a complex ecosystem of 20+ components spanning frontend UI, backend services, AI models, and database systems. The key innovation is the seamless integration of Gemini AI for real-time story generation while maintaining robust fallback mechanisms for reliability.

The transformation successfully converts traditional Likert-scale questions into engaging narrative scenarios while preserving the psychometric validity of RIASEC and Big Five assessments.