# 📁 CẤU TRÚC THƯ MỤC DỰ ÁN CAREER PLATFORM

## 🎯 TỔNG QUAN
- **Backend**: FastAPI + PostgreSQL + Neo4j
- **Frontend**: React + TypeScript + Vite
- **AI Core**: Python ML/AI package
- **Tổng cộng**: 959 nghề nghiệp, 22 nhóm ngành nghề, 5 career levels

---

## 🔧 BACKEND (apps/backend/)

```
apps/backend/
├── .env                           # Environment variables
├── .env.example                   # Environment template
├── requirements.txt               # Python dependencies
├── requirements_skill_gap.txt     # Skill gap specific deps
├── pytest.ini                    # Test configuration
├── start_backend.bat             # Windows startup script
├── restart_server.py             # Server restart utility
├── clear_rate_limit.py           # Rate limit management
├── install_pdf_libs.bat          # PDF processing setup
├── analyze_career_db.py          # Database analysis
├── detailed_career_analysis.py   # Career data analysis
├── analyze_career_structure.py   # Structure analysis
├── analyze_career_levels_detail.py # Level analysis
├── test_stories_api.py           # API testing
├── detailed_analysis_report.json # Analysis results
├── standalone_accuracy_report.json # Accuracy metrics
│
├── app/                          # Main application
│   ├── main.py                   # FastAPI app entry
│   ├── __pycache__/              # Python cache
│   │
│   ├── api/                      # API routes
│   │   ├── __init__.py
│   │   ├── bff_career.py         # Career BFF endpoints
│   │   └── __pycache__/
│   │
│   ├── bff/                      # Backend for Frontend
│   │   ├── dto.py                # Data transfer objects
│   │   ├── router.py             # BFF routing
│   │   └── __pycache__/
│   │
│   ├── core/                     # Core utilities
│   │   ├── __init__.py
│   │   ├── auth_deps.py          # Auth dependencies
│   │   ├── auth_middleware.py    # Auth middleware
│   │   ├── cache.py              # Caching system
│   │   ├── config.py             # App configuration
│   │   ├── database_monitor.py   # DB monitoring
│   │   ├── db.py                 # Database connection
│   │   ├── email_utils.py        # Email utilities
│   │   ├── email_verifier.py     # Email verification
│   │   ├── error_tracking.py     # Error tracking
│   │   ├── exceptions.py         # Custom exceptions
│   │   ├── gemini_manager.py     # Gemini AI manager
│   │   ├── jwt.py                # JWT handling
│   │   ├── logging.py            # Logging config
│   │   ├── monitoring.py         # System monitoring
│   │   ├── r2_storage.py         # R2 cloud storage
│   │   ├── rate_limiter.py       # Rate limiting
│   │   ├── security.py           # Security utilities
│   │   ├── subscription.py       # Subscription logic
│   │   └── __pycache__/
│   │
   ├── etl/                          # ETL processes
│   │   ├── __init__.py
│   │   ├── build_graph.py            # Neo4j graph building
│   │   ├── build_graph_fixed.py     # Fixed graph builder
│   │   ├── onet_enrich_ksas.py      # ONET KSA enrichment
│   │   ├── onet_enrich_main.py      # Main enrichment
│   │   ├── onet_enrich_online.py    # Online enrichment
│   │   ├── onet_loader.py           # ONET data loader
│   │   └── online_parsers.py        # Online data parsers
│   │
│   ├── modules/                      # Feature modules
│   │   ├── admin/                    # Admin management
│   │   ├── analytics/                # Analytics & reporting
│   │   ├── assessment/               # Career assessments
│   │   ├── assessments/              # Assessment variants
│   │   ├── auth/                     # Authentication
│   │   ├── careers/                  # Career management
│   │   ├── chatbot/                  # AI chatbot
│   │   ├── content/                  # Content management
│   │   ├── goals/                    # Career goals
│   │   ├── graph/                    # Neo4j graph ops
│   │   ├── interview/                # AI interview
│   │   ├── nlp/                      # NLP processing
│   │   ├── nlu/                      # Natural language understanding
│   │   ├── notifications/            # Notification system
│   │   ├── payment/                  # Payment processing
│   │   ├── realtime/                 # Real-time features
│   │   ├── recommendation/           # Career recommendations
│   │   ├── reports/                  # Report generation
│   │   ├── retrieval/                # Information retrieval
│   │   ├── roadmap/                  # Career roadmaps
│   │   ├── search/                   # Search functionality
│   │   ├── skill_gap/                # Skill gap analysis
│   │   ├── subscription/             # Subscription management
│   │   ├── system/                   # System utilities
│   │   ├── users/                    # User management
│   │   └── user_profile/             # User profiles
│   │
│   ├── repositories/                 # Data repositories
│   │   └── __init__.py
│   │
│   ├── schemas/                      # Pydantic schemas
│   │   └── __init__.py
│   │
│   ├── scripts/                      # Utility scripts
│   │   ├── create_admin.py           # Admin user creation
│   │   └── seed_bulk.py              # Bulk data seeding
│   │
│   ├── services/                     # Business services
│   │   ├── __init__.py
│   │   ├── ai_client.py              # AI service client
│   │   ├── onetsvc.py                # ONET service
│   │   ├── onet_client_v2.py         # ONET client v2
│   │   └── subscription_service.py   # Subscription service
│   │
│   ├── tasks/                        # Background tasks
│   │   └── __init__.py
│   │
│   └── tests/                        # Test suites
│       ├── __init__.py
│       ├── comprehensive_interview_test_suite.py
│       ├── final_comprehensive_validation_test.py
│       ├── final_interview_verification.py
│       ├── simple_interview_test.py
│       ├── test_api_4step_flow.py
│       ├── test_fixed_services_logic.py
│       ├── test_intelligent_interview_validation.py
│       ├── test_interview_comprehensive_flow.py
│       ├── test_interview_fixes_verification.py
│       ├── test_interview_integration.py
│       ├── test_interview_with_auth.py
│       ├── test_login.py
│       ├── test_new_4step_flow.py
│       ├── test_new_work_activities_data.py
│       ├── test_real_interview_integration.py
│       ├── test_sample.py
│       ├── test_story_api_visibility.py
│       ├── test_tc04_riasec_ocean.py
│       ├── test_tc05_voice_ai.py
│       ├── test_tc10_recommendation.py
│       ├── test_tc12_thompson_sampling.py
│       ├── test_tc15_ban_user.py
│       ├── test_tc16_ai_monitor.py
│       ├── test_tc17_export_csv.py
│       ├── test_tc18_phobert.py
│       ├── test_tc19_pgvector.py
│       ├── test_tc_img_cv.py
│       ├── test_tc_non_cv.py
│       ├── test_tc_pdf_non_cv.py
│       ├── validate_interview_logic.py
│       ├── verify_interview_logic.py
│       └── __pycache__/
│
├── interview/                        # Interview documentation
│   ├── BAO_CAO_TRIEN_KHAI_AI_MOCK_INTERVIEWER.md
│   └── DB_Interview.txt
│
└── neo4j/                           # Neo4j specific
    ├── analyze_current_data_source.py
    ├── BAO_CAO_TRIEN_KHAI_NEO4J.md
    ├── COMPREHENSIVE_TEST_SUMMARY.py
    ├── FINAL_TEST_REPORT.py
    ├── QUERY_EXPLANATION.md
    ├── README.md
    └── rebuild_etl_with_work_activities.py
```

---

## 🎨 FRONTEND (apps/frontend/)

```
apps/frontend/
├── package.json                  # Dependencies & scripts
├── package-lock.json            # Lock file
├── .env.example                  # Environment template
├── .eslintrc.cjs                # ESLint config
├── index.html                    # HTML entry point
├── postcss.config.js            # PostCSS config
├── tailwind.config.js           # Tailwind CSS config
├── tsconfig.json                # TypeScript config
├── tsconfig.node.json           # Node TypeScript config
├── vite.config.ts               # Vite bundler config
├── node_modules/                # Dependencies
├── dist/                        # Build output
│
├── public/                      # Static assets
│   ├── favicon.svg
│   ├── assets/                  # Images & assets
│   │   ├── bg.jpg
│   │   ├── leaf_01.png
│   │   ├── leaf_02.png
│   │   ├── leaf_03.png
│   │   └── leaf_04.png
│   └── images/
│       └── blog/                # Blog images
│
└── src/                         # Source code
    ├── App.tsx                  # Main App component
    ├── main.tsx                 # React entry point
    ├── index.css                # Global styles
    ├── vite-env.d.ts           # Vite types
    │
    ├── components/              # React components
    │   ├── AdminRoute.tsx       # Admin route guard
    │   ├── ProtectedRoute.tsx   # Auth route guard
    │   ├── LanguageSwitcher.tsx # Language switcher
    │   ├── ThemeToggle.tsx      # Theme toggle
    │   │
    │   ├── admin/               # Admin components
    │   ├── assessment/          # Assessment components
    │   ├── blog/                # Blog components
    │   ├── chatbot/             # Chatbot components
    │   ├── common/              # Common/shared components
    │   ├── dashboard/           # Dashboard components
    │   ├── home/                # Home page components
    │   ├── interview/           # Interview components
    │   ├── layout/              # Layout components
    │   ├── notifications/       # Notification components
    │   ├── payment/             # Payment components
    │   ├── profile/             # Profile components
    │   ├── report/              # Report components
    │   ├── results/             # Results components
    │   ├── roadmap/             # Roadmap components
    │   ├── skillgap/            # Skill gap components
    │   └── subscription/        # Subscription components
    │
    ├── config/                  # Configuration
    │   └── reportConfig.json    # Report configuration
    │
    ├── contexts/                # React contexts
    │   ├── AppSettingsContext.tsx
    │   ├── AuthContext.tsx
    │   ├── LanguageContext.tsx
    │   ├── SocketContext.tsx
    │   └── ThemeContext.tsx
    │
    ├── hooks/                   # Custom hooks
    │   ├── useApiCache.ts
    │   ├── useApiCallTracker.ts
    │   ├── useCommentWebSocket.ts
    │   ├── useDebounce.ts
    │   ├── useFeatureAccess.ts
    │   ├── usePerformanceMonitoring.ts
    │   ├── useReportData.ts
    │   ├── useSubscription.ts
    │   └── useUsageTracking.ts
    │
    ├── i18n/                    # Internationalization
    │   ├── config.ts            # i18n configuration
    │   └── locales/             # Language files
    │
    ├── lib/                     # Utilities
    │   └── api.ts               # API utilities
    │
    ├── pages/                   # Page components
    │   ├── admin/               # Admin pages
    │   ├── AssessmentHistoryPage.tsx
    │   ├── AssessmentPage.tsx
    │   ├── BlogCreatePage.tsx
    │   ├── BlogDetailPage.tsx
    │   ├── BlogPage.tsx
    │   ├── CareerDetailPage.tsx
    │   ├── CareerGoalsPage.tsx
    │   ├── CareersPage.tsx
    │   ├── ChatPage.tsx
    │   ├── ChatSummaryPage.tsx
    │   ├── DashboardPage.tsx
    │   ├── DebugAuthPage.tsx
    │   ├── EssayInputPage.tsx
    │   ├── ForgotPasswordPage.tsx
    │   ├── HomePage.tsx
    │   ├── InterviewHistoryPage.tsx
    │   ├── InterviewListPage.tsx
    │   ├── InterviewPage.tsx
    │   ├── InterviewResultsPage.tsx
    │   ├── InterviewSelectionPage.tsx
    │   ├── LoginPage.tsx
    │   ├── OAuthCallbackPage.tsx
    │   ├── PaymentPage.tsx
    │   ├── ProfilePage.tsx
    │   ├── ProgressComparisonPage.tsx
    │   ├── QuizModeSelectorPage.tsx
    │   ├── RecommendationsPage.tsx
    │   ├── RegisterPage.tsx
    │   ├── ReportPage.tsx
    │   ├── ResetPasswordPage.tsx
    │   ├── ResultsPage.tsx
    │   ├── RoadmapPage.tsx
    │   ├── SessionResultsPage.tsx
    │   ├── SkillGapPage.tsx
    │   ├── SkillGapPage.css
    │   ├── SubscriptionDemoPage.tsx
    │   └── VerifyEmailPage.tsx
    │
    ├── services/                # API services
    │   ├── adminService.ts
    │   ├── assessmentService.ts
    │   ├── authTokenService.ts
    │   ├── blogService.ts
    │   ├── careerService.ts
    │   ├── commentService.ts
    │   ├── dashboardService.ts
    │   ├── feedbackService.ts
    │   ├── geminiService.ts
    │   ├── goalsService.ts
    │   ├── interviewService.ts
    │   ├── notificationService.ts
    │   ├── paymentService.ts
    │   ├── profileService.ts
    │   ├── recommendationService.ts
    │   ├── reportService.ts
    │   ├── roadmapService.ts
    │   ├── skillGapService.ts
    │   ├── storyGeneratorService.ts
    │   ├── subscriptionService.ts
    │   ├── trackService.ts
    │   ├── translationService.hybrid.ts
    │   ├── translationService.official.ts
    │   └── translationService.ts
    │
    ├── style/                   # Legacy styles
    │   └── footer.css
    │
    ├── styles/                  # Modern styles
    │   ├── design-system.css
    │   ├── footer.css
    │   └── progress-comparison.css
    │
    ├── types/                   # TypeScript types
    │   ├── admin.ts
    │   ├── assessment.ts
    │   ├── dashboard.ts
    │   ├── notification.ts
    │   ├── profile.ts
    │   ├── results.ts
    │   ├── roadmap.ts
    │   ├── skillGap.ts
    │   └── traits.ts
    │
    ├── utils/                   # Utility functions
    │   ├── auth.ts
    │   ├── blogImages.ts
    │   ├── quadrantComputation.ts
    │   ├── reportTextGeneration.ts
    │   ├── riasec.ts
    │   ├── riasecPattern.ts
    │   └── subscriptionUtils.ts
    │
    └── __tests__/               # Frontend tests
        ├── tc04_riasec_scoring.test.ts
        ├── tc05_voice_utils.test.ts
        └── tc10_recommendation.test.ts
```

---

## 🤖 AI CORE (packages/ai-core/)

```
packages/ai-core/
├── .gitattributes               # Git attributes
├── .gitignore                   # Git ignore rules
├── .pre-commit-config.yaml      # Pre-commit hooks
├── pyproject.toml               # Python project config
├── requirements.txt             # Python dependencies
│
├── configs/                     # Configuration files
│   ├── encode.yaml              # Encoding config
│   ├── nlp.yaml                 # NLP config
│   ├── nlp_big5.yaml           # Big5 NLP config
│   └── schema.yaml              # Schema config
│
├── data/                        # Data files
│   ├── các_bước_packages_ai-core_data.txt
│   │
│   ├── catalog/                 # Career catalogs
│   │   ├── backup/              # Backup data
│   │   ├── jobs_final_en.csv    # English jobs
│   │   ├── jobs_final_vi.csv    # Vietnamese jobs
│   │   ├── onet_tags.json       # ONET tags
│   │   ├── skill_trans_vi.json  # Vietnamese skills
│   │   └── tag_vocab.json       # Tag vocabulary
│   │
│   ├── embeddings/              # Vector embeddings
│   │   ├── jobs_index_visbert.json
│   │   ├── test_index.json
│   │   ├── train_index.json
│   │   └── val_index.json
│   │
│   ├── nlp/                     # NLP data
│   ├── processed/               # Processed data
│   └── raw/                     # Raw data
│
├── docs/                        # Documentation
│   ├── CAREER_DETAILS_COMPLETION.md
│   ├── NEO4J_DEPLOYMENT_SUCCESS.md
│   ├── STORY_ASSESSMENT_COMPONENTS_ANALYSIS.md
│   ├── STORY_ASSESSMENT_DATA_COLLECTION.md
│   ├── STORY_ASSESSMENT_LOGIC_ANALYSIS.md
│   ├── STORY_ASSESSMENT_SERVICES_ANALYSIS.md
│   ├── STORY_ASSESSMENT_TRANSFORMATION_FRAMEWORK.md
│   ├── STORY_QUESTION_FILTERING_AND_PROMPT_ENGINEERING.md
│   ├── TONG_HOP_CHIEN_LUOC_HOAN_THANH.md
│   └── VIETNAMESE_LOCALIZATION_FINAL_REPORT.md
│
├── models/                      # ML models
│   ├── big5_phobert/           # Big5 PhoBERT model
│   ├── en_sbert_768/           # English SBERT
│   ├── recsys_mlp/             # Recommendation MLP
│   ├── riasec_phobert/         # RIASEC PhoBERT
│   └── vi_sbert_768/           # Vietnamese SBERT
│
├── notebooks/                   # Jupyter notebooks
│   └── GoogleForm_to_responses_processed.ipynb
│
├── scripts/                     # Utility scripts
│   ├── career_prep_statistics.sql
│   ├── complete_alternate_titles_enhancement.sql
│   ├── complete_ksas_translation.py
│   ├── comprehensive_data_fix.py
│   ├── create_tables.sql
│   ├── create_tables_direct.py
│   ├── enhance_careers_alternate_titles.py
│   ├── enrich_with_esco_skills.py
│   ├── etl_mapping_esco_onet.py
│   ├── etl_pipeline_status.py
│   ├── expand_vietnamese_translations.py
│   ├── finalize_vietnamese_translations.py
│   ├── generate_alternate_titles_sql.py
│   ├── improve_career_outlook_translation.py
│   ├── insert_alternate_titles_data.sql
│   ├── integrate_esco_data.py
│   ├── load_jobs_to_database.py
│   ├── merge_all_other_jobs.py
│   ├── normalize_education_percentages.py
│   ├── onet_esco_mapping_analysis.py
│   ├── organize_raw_data.py
│   ├── parse_job_zones_complete.py
│   ├── parse_onet_alternate_titles_full.py
│   ├── reload_core_tables.py
│   ├── restructure_career_overview_columns.py
│   ├── run_etl_pipeline.py
│   ├── setup_database.py
│   ├── translate_and_tag_jobs.py
│   └── translate_career_ksas.py
│
├── src/                         # Source code
│   ├── ai_core/                 # AI core package
│   ├── ai_core.egg-info/        # Package info
│   ├── api/                     # API modules
│   ├── data/                    # Data processing
│   └── rl/                      # Reinforcement learning
│
├── tests/                       # Test files
│   ├── scratch_test_infer.py
│   ├── test_data_and_labels.py
│   ├── test_embeddings_full.py
│   ├── test_schema_min.py
│   └── test_training_basics.py
│
└── tools/                       # Development tools
    ├── load_assessments_all.py
    ├── load_careers.py
    ├── load_career_embeddings_from_jobs.py
    └── move_one_from_train_to_val.py
```

---

## 📊 THỐNG KÊ TỔNG QUAN

### 🔧 Backend
- **50+ modules** trong `app/modules/`
- **30+ test files** với coverage đầy đủ
- **959 nghề nghiệp** trong database
- **22 nhóm ngành nghề** ONET
- **5 career levels** (Job Zones)

### 🎨 Frontend  
- **40+ pages** React components
- **20+ services** API integration
- **15+ hooks** custom React hooks
- **Multi-language** support (EN/VI)
- **Dark/Light theme** support

### 🤖 AI Core
- **100+ scripts** ETL & data processing
- **5 ML models** trained & ready
- **Multiple datasets** processed
- **Vector embeddings** for search
- **NLP pipelines** for Vietnamese

### 🎯 Tính năng chính
- ✅ **Career Assessment** - Đánh giá nghề nghiệp
- ✅ **AI Interview** - Phỏng vấn AI thông minh  
- ✅ **Skill Gap Analysis** - Phân tích khoảng cách kỹ năng
- ✅ **Career Recommendations** - Gợi ý nghề nghiệp
- ✅ **Learning Roadmaps** - Lộ trình học tập
- ✅ **Real-time Chat** - Chat bot AI
- ✅ **Payment System** - Hệ thống thanh toán
- ✅ **Admin Dashboard** - Quản trị hệ thống

**🚀 Platform hoàn chỉnh với 959 nghề nghiệp, 22 nhóm ngành nghề và 5 career levels!**