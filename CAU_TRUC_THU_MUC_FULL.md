# CẤU TRÚC THƯ MỤC DỰ ÁN CAREER PLATFORM

## TỔNG QUAN
- Backend: FastAPI + PostgreSQL + Neo4j
- Frontend: React + TypeScript + Vite
- AI Core: Python ML/AI package
- Tổng cộng: 959 nghề nghiệp, 22 nhóm ngành nghề, 5 career levels

---

## ROOT (AI-Based-Career-Recommendation-System/)

```
AI-Based-Career-Recommendation-System/
├── .gitignore
├── .pre-commit-config.yaml
├── pyproject.toml
├── docker-compose.yml
├── README.md
├── CONTRIBUTING.md
├── MASTER.md
├── CAU_TRUC_THU_MUC_FULL.md
├── INTERVIEW_AI_LOGIC_FLOW.md
├── BAO_CAO_INTERVIEW_AI_SYSTEM.md
├── BAO_CAO_PHAN_TICH_CAREER_LEVELS_VA_GROUPS.md
├── Mentor-Mentee-Matching-Report.md
├── bao-cao-chuc-nang-market-trend.md
├── bao-cao-chuc-nang-roadmap-courses.md
├── bao-cao-crawler-market-trend.md
├── DB-Career_.txt
├── DB-Group-Career.txt
├── DB-Roadmap.txt
├── log-be.txt
├── BAO_CAO_BAN_GIAO_CUOI_CUNG.py
├── final_gemini_verification.py
├── kiem_tra_toan_dien_100_phan_tram.py
├── test_complete_api_integration_final.py
├── test_cuoi_cung_100_phan_tram.py
├── test_gemini_integration_complete.py
│
├── .github/
├── .md/                          # 95 markdown docs (reports, guides)
├── apps/
│   ├── backend/
│   └── frontend/
├── db/                           # Database init scripts
└── packages/
    └── ai-core/
```

---

## BACKEND (apps/backend/)

```
apps/backend/
├── .env
├── .env.example
├── requirements.txt
├── pytest.ini
├── start_backend.bat
├── restart_server.py
├── install_pdf_libs.bat
├── detailed_career_analysis.py
├── detailed_analysis_report.json
├── standalone_accuracy_report.json
├── README.md
│
├── app/
│   ├── main.py                   # FastAPI app entry
│   │
│   ├── api/
│   │   ├── __init__.py
│   │   └── bff_career.py
│   │
│   ├── bff/
│   │   ├── dto.py
│   │   └── router.py
│   │
│   ├── core/
│   │   ├── __init__.py
│   │   ├── auth_deps.py
│   │   ├── auth_middleware.py
│   │   ├── cache.py
│   │   ├── config.py
│   │   ├── database_monitor.py
│   │   ├── db.py
│   │   ├── email_utils.py
│   │   ├── email_verifier.py
│   │   ├── error_tracking.py
│   │   ├── exceptions.py
│   │   ├── gemini_manager.py
│   │   ├── jwt.py
│   │   ├── logging.py
│   │   ├── monitoring.py
│   │   ├── r2_storage.py
│   │   ├── rate_limiter.py
│   │   ├── security.py
│   │   └── subscription.py
│   │
│   ├── etl/
│   │   ├── __init__.py
│   │   ├── build_graph.py
│   │   ├── build_graph_fixed.py
│   │   ├── onet_enrich_ksas.py
│   │   ├── onet_enrich_main.py
│   │   ├── onet_enrich_online.py
│   │   ├── onet_loader.py
│   │   └── online_parsers.py
│   │
│   ├── modules/
│   │   ├── admin/
│   │   │   ├── __init__.py
│   │   │   ├── routes.py
│   │   │   └── routes_admin.py
│   │   │
│   │   ├── analytics/
│   │   │   ├── models.py
│   │   │   ├── routes_tracking.py
│   │   │   └── service_career_events.py
│   │   │
│   │   ├── assessment/
│   │   │   └── story_generator.py
│   │   │
│   │   ├── assessments/
│   │   │   ├── __init__.py
│   │   │   ├── gamification_models.py
│   │   │   ├── gamification_service.py
│   │   │   ├── models.py
│   │   │   ├── routes_assessments.py
│   │   │   ├── routes_gamification.py
│   │   │   ├── schemas.py
│   │   │   ├── service.py
│   │   │   └── voice_analyzer.py
│   │   │
│   │   ├── auth/
│   │   │   ├── __init__.py
│   │   │   ├── deps.py
│   │   │   ├── models.py
│   │   │   ├── routes_google.py
│   │   │   ├── routes_tokens.py
│   │   │   ├── token_utils.py
│   │   │   └── verification.py
│   │   │
│   │   ├── careers/
│   │   │   ├── __init__.py
│   │   │   ├── models.py
│   │   │   ├── routes.py
│   │   │   ├── routes_trait_evidence.py
│   │   │   ├── schema.py
│   │   │   ├── schemas.py
│   │   │   ├── service_trait_evidence.py
│   │   │   ├── services.py
│   │   │   └── services_enhanced.py
│   │   │
│   │   ├── chatbot/
│   │   │   ├── __init__.py
│   │   │   ├── chat_service.py
│   │   │   ├── gemini_service.py
│   │   │   ├── models.py
│   │   │   └── routes.py
│   │   │
│   │   ├── content/
│   │   │   ├── models.py
│   │   │   ├── routes_blog.py
│   │   │   ├── routes_careers.py
│   │   │   ├── routes_comments.py
│   │   │   ├── routes_essays.py
│   │   │   ├── routes_skills.py
│   │   │   └── service_careers.py
│   │   │
│   │   ├── goals/
│   │   │   ├── __init__.py
│   │   │   └── routes_goals.py
│   │   │
│   │   ├── graph/
│   │   │   ├── neo4j_client.py
│   │   │   └── routes_graph.py
│   │   │
│   │   ├── interview/
│   │   │   ├── __init__.py
│   │   │   ├── ai_pipeline_service.py
│   │   │   ├── context_builder.py
│   │   │   ├── init_db.py
│   │   │   ├── jd_service.py
│   │   │   ├── models.py
│   │   │   ├── routes.py
│   │   │   ├── schemas.py
│   │   │   └── services.py
│   │   │
│   │   ├── nlp/
│   │   │   ├── __init__.py
│   │   │   ├── routes_nlp.py
│   │   │   └── service_nlp.py
│   │   │
│   │   ├── nlu/
│   │   │   └── __init__.py
│   │   │
│   │   ├── notifications/
│   │   │   ├── models.py
│   │   │   └── routes_notifications.py
│   │   │
│   │   ├── payment/
│   │   │   ├── __init__.py
│   │   │   ├── models.py
│   │   │   ├── routes_admin.py
│   │   │   ├── routes_admin_backup.py
│   │   │   ├── routes_payment.py
│   │   │   ├── schemas.py
│   │   │   ├── vnpay_service.py
│   │   │   └── zalopay_service.py
│   │   │
│   │   ├── realtime/
│   │   │   ├── ws_comments.py
│   │   │   └── ws_notifications.py
│   │   │
│   │   ├── recommendation/
│   │   │   ├── __init__.py
│   │   │   ├── migration_career_feedback.sql
│   │   │   ├── routes_recommendations.py
│   │   │   ├── service.py
│   │   │   └── thompson_sampling.py
│   │   │
│   │   ├── reports/
│   │   │   ├── __init__.py
│   │   │   ├── models.py
│   │   │   ├── personality_types.py
│   │   │   ├── routes.py
│   │   │   ├── schemas.py
│   │   │   └── service.py
│   │   │
│   │   ├── retrieval/
│   │   │   └── __init__.py
│   │   │
│   │   ├── roadmap/
│   │   │   ├── models.py
│   │   │   └── service.py
│   │   │
│   │   ├── search/
│   │   │   ├── __init__.py
│   │   │   ├── es_client.py
│   │   │   └── routes_search.py
│   │   │
│   │   ├── skill_gap/
│   │   │   ├── __init__.py
│   │   │   ├── cv_extractor_enhanced.py
│   │   │   ├── cv_parser.py
│   │   │   ├── cv_parser_advanced.py
│   │   │   ├── cv_parser_v2.py
│   │   │   ├── cv_validator.py
│   │   │   ├── gemini_utils.py
│   │   │   ├── graph_analyzer.py
│   │   │   ├── models.py
│   │   │   ├── routes.py
│   │   │   ├── schemas.py
│   │   │   └── service.py
│   │   │
│   │   ├── subscription/
│   │   │   ├── __init__.py
│   │   │   └── routes.py
│   │   │
│   │   ├── system/
│   │   │   ├── models.py
│   │   │   └── routes_public.py
│   │   │
│   │   ├── user_profile/
│   │   │   ├── __init__.py
│   │   │   └── router.py
│   │   │
│   │   └── users/
│   │       ├── __init__.py
│   │       ├── models.py
│   │       ├── repository.py
│   │       ├── router_auth.py
│   │       ├── routers_users.py
│   │       ├── routes_profile.py
│   │       └── service.py
│   │
│   ├── repositories/
│   │   └── __init__.py
│   │
│   ├── schemas/
│   │   └── __init__.py
│   │
│   ├── scripts/
│   │   ├── create_admin.py
│   │   ├── map_careers_to_enhanced_levels.py
│   │   ├── migrate_career_groups_levels.py
│   │   └── seed_bulk.py
│   │
│   ├── services/
│   │   ├── __init__.py
│   │   ├── ai_client.py
│   │   ├── onet_client_v2.py
│   │   ├── onetsvc.py
│   │   └── subscription_service.py
│   │
│   ├── tasks/
│   │   └── __init__.py
│   │
│   └── tests/
│       ├── __init__.py
│       ├── comprehensive_interview_test_suite.py
│       ├── final_comprehensive_validation_test.py
│       ├── final_interview_verification.py
│       ├── simple_interview_test.py
│       ├── test_api_4step_flow.py
│       ├── test_closing_hr_response_dynamic_jd.py  # 20 TC dynamic JD
│       ├── test_fixed_services_logic.py
│       ├── test_intelligent_interview_validation.py
│       ├── test_interview_comprehensive_flow.py
│       ├── test_interview_fixes_verification.py
│       ├── test_interview_integration.py
│       ├── test_interview_with_auth.py
│       ├── test_jd_feature.py
│       ├── test_login.py
│       ├── test_new_4step_flow.py
│       ├── test_new_work_activities_data.py
│       ├── test_real_interview_integration.py
│       ├── test_sample.py
│       ├── test_skills_selection_logic.py
│       ├── test_story_api_visibility.py
│       ├── test_tc_img_cv.py
│       ├── test_tc_non_cv.py
│       ├── test_tc_pdf_non_cv.py
│       ├── test_tc04_riasec_ocean.py
│       ├── test_tc05_voice_ai.py
│       ├── test_tc10_recommendation.py
│       ├── test_tc12_thompson_sampling.py
│       ├── test_tc15_ban_user.py
│       ├── test_tc16_ai_monitor.py
│       ├── test_tc17_export_csv.py
│       ├── test_tc18_phobert.py
│       ├── test_tc19_pgvector.py
│       ├── validate_interview_logic.py
│       └── verify_interview_logic.py
│
├── interview/
│   ├── BAO_CAO_TRIEN_KHAI_AI_MOCK_INTERVIEWER.md
│   └── DB_Interview.txt
│
└── neo4j/
    ├── analyze_current_data_source.py
    ├── BAO_CAO_TRIEN_KHAI_NEO4J.md
    ├── COMPREHENSIVE_TEST_SUMMARY.py
    ├── FINAL_TEST_REPORT.py
    ├── QUERY_EXPLANATION.md
    ├── README.md
    └── rebuild_etl_with_work_activities.py
```

---

## FRONTEND (apps/frontend/)

```
apps/frontend/
├── package.json
├── package-lock.json
├── .env.example
├── .eslintrc.cjs
├── index.html
├── postcss.config.js
├── tailwind.config.js
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
├── FINAL_SCROLL_VERIFICATION.md
├── SCROLL_FIX_FINAL.md
├── SCROLL_FIX_SUMMARY.md
├── ULTRA_FINAL_VERIFICATION.md
├── dist/
├── node_modules/
│
├── public/
│   ├── favicon.svg
│   ├── assets/
│   │   ├── bg.jpg
│   │   ├── leaf_01.png
│   │   ├── leaf_02.png
│   │   ├── leaf_03.png
│   │   └── leaf_04.png
│   └── images/
│       └── blog/
│
└── src/
    ├── App.tsx
    ├── main.tsx
    ├── index.css
    ├── vite-env.d.ts
    │
    ├── components/
    │   ├── AdminRoute.tsx
    │   ├── LanguageSwitcher.tsx
    │   ├── ProtectedRoute.tsx
    │   ├── ThemeToggle.tsx
    │   ├── admin/
    │   ├── assessment/
    │   ├── blog/
    │   ├── chatbot/
    │   ├── common/
    │   ├── dashboard/
    │   ├── home/
    │   ├── interview/
    │   ├── layout/
    │   ├── notifications/
    │   ├── payment/
    │   ├── profile/
    │   ├── report/
    │   ├── results/
    │   ├── roadmap/
    │   ├── skillgap/
    │   └── subscription/
    │
    ├── config/
    │   └── reportConfig.json
    │
    ├── contexts/
    │   ├── AppSettingsContext.tsx
    │   ├── AuthContext.tsx
    │   ├── LanguageContext.tsx
    │   ├── SocketContext.tsx
    │   └── ThemeContext.tsx
    │
    ├── hooks/
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
    ├── i18n/
    │   ├── config.ts
    │   └── locales/
    │
    ├── lib/
    │   └── api.ts
    │
    ├── pages/
    │   ├── admin/
    │   ├── AssessmentHistoryPage.tsx
    │   ├── AssessmentPage.tsx
    │   ├── BlogCreatePage.tsx
    │   ├── BlogDetailPage.tsx
    │   ├── BlogPage.tsx
    │   ├── CareerDetailPage.tsx
    │   ├── CareerGoalsPage.tsx
    │   ├── CareerGroupsPage.tsx
    │   ├── CareerRedirectPage.tsx
    │   ├── CareerRouterPage.tsx
    │   ├── CareersByGroupPage.tsx
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
    │   ├── SkillGapPage.css
    │   ├── SkillGapPage.tsx
    │   ├── SubscriptionDemoPage.tsx
    │   └── VerifyEmailPage.tsx
    │
    ├── services/
    │   ├── adminService.ts
    │   ├── assessmentService.ts
    │   ├── authTokenService.ts
    │   ├── blogService.ts
    │   ├── careerGroupService.ts
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
    ├── style/
    │   └── footer.css
    │
    ├── styles/
    │   ├── design-system.css
    │   ├── footer.css
    │   └── progress-comparison.css
    │
    ├── types/
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
    ├── utils/
    │   ├── auth.ts
    │   ├── blogImages.ts
    │   ├── quadrantComputation.ts
    │   ├── reportTextGeneration.ts
    │   ├── riasec.ts
    │   ├── riasecPattern.ts
    │   └── subscriptionUtils.ts
    │
    └── __tests__/
        ├── tc04_riasec_scoring.test.ts
        ├── tc05_voice_utils.test.ts
        └── tc10_recommendation.test.ts
```

---

## AI CORE (packages/ai-core/)

```
packages/ai-core/
├── .gitattributes
├── .gitignore
├── .pre-commit-config.yaml
├── pyproject.toml
├── requirements.txt
│
├── configs/
│   ├── encode.yaml
│   ├── nlp.yaml
│   ├── nlp_big5.yaml
│   └── schema.yaml
│
├── data/
│   ├── catalog/
│   │   ├── backup/
│   │   ├── jobs_final_en.csv
│   │   ├── jobs_final_vi.csv
│   │   ├── onet_tags.json
│   │   ├── skill_trans_vi.json
│   │   └── tag_vocab.json
│   ├── embeddings/
│   │   ├── jobs_index_visbert.json
│   │   ├── test_index.json
│   │   ├── train_index.json
│   │   └── val_index.json
│   ├── nlp/
│   ├── processed/
│   └── raw/
│
├── docs/
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
├── models/
│   ├── big5_phobert/
│   ├── en_sbert_768/
│   ├── recsys_mlp/
│   ├── riasec_phobert/
│   └── vi_sbert_768/
│
├── notebooks/
│   └── GoogleForm_to_responses_processed.ipynb
│
├── scripts/
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
├── src/
│   ├── ai_core/
│   ├── ai_core.egg-info/
│   ├── api/
│   ├── data/
│   └── rl/
│
├── tests/
│   ├── scratch_test_infer.py
│   ├── test_data_and_labels.py
│   ├── test_embeddings_full.py
│   ├── test_schema_min.py
│   └── test_training_basics.py
│
└── tools/
    ├── load_assessments_all.py
    ├── load_careers.py
    ├── load_career_embeddings_from_jobs.py
    └── move_one_from_train_to_val.py
```

---

## THONG KE

### Backend
- 26 modules trong app/modules/
- 35 test files trong app/tests/
- 4 scripts trong app/scripts/
- 959 nghe nghiep trong database
- 22 nhom nganh nghe ONET
- 5 career levels (Job Zones)

### Frontend
- 44 pages (bao gom 5 trang Career moi: CareerGroupsPage, CareerRedirectPage, CareerRouterPage, CareersByGroupPage)
- 24 services API integration (bao gom careerGroupService.ts moi)
- 9 hooks custom React hooks
- Multi-language support (EN/VI)
- Dark/Light theme support

### AI Core
- 30+ scripts ETL & data processing
- 5 ML models trained & ready
- Multiple datasets processed
- Vector embeddings for search
- NLP pipelines for Vietnamese

### Tinh nang chinh
- Career Assessment - Danh gia nghe nghiep
- AI Interview - Phong van AI thong minh
- Skill Gap Analysis - Phan tich khoang cach ky nang
- Career Recommendations - Goi y nghe nghiep
- Learning Roadmaps - Lo trinh hoc tap
- Real-time Chat - Chat bot AI
- Payment System - He thong thanh toan (VNPay + ZaloPay)
- Admin Dashboard - Quan tri he thong
- Career Groups - 22 nhom nganh nghe
- Career Levels - 5 cap do nghe nghiep

Platform hoan chinh voi 959 nghe nghiep, 22 nhom nganh nghe va 5 career levels!
