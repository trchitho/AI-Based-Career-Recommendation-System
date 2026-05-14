import { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { careerGroupService, CareersByGroupResponse } from '../services/careerGroupService';
import { useFeatureAccess } from '../hooks/useFeatureAccess';
import { useUsageTracking } from '../hooks/useUsageTracking';
import { useApiCallTracker } from '../hooks/useApiCallTracker';

// ─── Career image map (Unsplash API + Wikimedia Commons) ──────────────────
// 959/959 careers mapped to local images
export const CAREER_IMAGES: Record<string, string> = {
    // ── ARCHITECTURE ENGINEERING ──
    '17-1011.00': '/images/careers/architecture-engineering/architects-except-landscape-and-naval.jpg',
    '17-1012.00': '/images/careers/architecture-engineering/landscape-architects.jpg',
    '17-1021.00': '/images/careers/architecture-engineering/cartographers-and-photogrammetrists.jpg',
    '17-1022.00': '/images/careers/architecture-engineering/surveyors.jpg',
    '17-1022.01': '/images/careers/architecture-engineering/geodetic-surveyors.jpg',
    '17-2011.00': '/images/careers/architecture-engineering/aerospace-engineers.jpg',
    '17-2021.00': '/images/careers/architecture-engineering/agricultural-engineers.jpg',
    '17-2031.00': '/images/careers/architecture-engineering/bioengineers-and-biomedical-engineers.jpg',
    '17-2041.00': '/images/careers/architecture-engineering/chemical-engineers.jpg',
    '17-2051.00': '/images/careers/architecture-engineering/civil-engineers.jpg',
    '17-2051.01': '/images/careers/architecture-engineering/transportation-engineers.jpg',
    '17-2051.02': '/images/careers/architecture-engineering/waterwastewater-engineers.jpg',
    '17-2061.00': '/images/careers/architecture-engineering/computer-hardware-engineers.jpg',
    '17-2071.00': '/images/careers/architecture-engineering/electrical-engineers.jpg',
    '17-2072.00': '/images/careers/architecture-engineering/electronics-engineers-except-computer.jpg',
    '17-2072.01': '/images/careers/architecture-engineering/radio-frequency-identification-device-specialists.jpg',
    '17-2081.00': '/images/careers/architecture-engineering/environmental-engineers.jpg',
    '17-2111.00': '/images/careers/architecture-engineering/health-and-safety-engineers-except-mining-safety-engineers-a.jpg',
    '17-2111.02': '/images/careers/architecture-engineering/fire-prevention-and-protection-engineers.jpg',
    '17-2112.00': '/images/careers/architecture-engineering/industrial-engineers.jpg',
    '17-2112.01': '/images/careers/architecture-engineering/human-factors-engineers-and-ergonomists.jpg',
    '17-2112.02': '/images/careers/architecture-engineering/validation-engineers.jpg',
    '17-2112.03': '/images/careers/architecture-engineering/manufacturing-engineers.jpg',
    '17-2121.00': '/images/careers/architecture-engineering/marine-engineers-and-naval-architects.jpg',
    '17-2131.00': '/images/careers/architecture-engineering/materials-engineers.jpg',
    '17-2141.00': '/images/careers/architecture-engineering/mechanical-engineers.jpg',
    '17-2141.01': '/images/careers/architecture-engineering/fuel-cell-engineers.jpg',
    '17-2141.02': '/images/careers/architecture-engineering/automotive-engineers.jpg',
    '17-2151.00': '/images/careers/architecture-engineering/mining-and-geological-engineers-including-mining-safety-engi.jpg',
    '17-2161.00': '/images/careers/architecture-engineering/nuclear-engineers.jpg',
    '17-2171.00': '/images/careers/architecture-engineering/petroleum-engineers.jpg',
    '17-2199.00': '/images/careers/architecture-engineering/engineers-all-other.jpg',
    '17-2199.03': '/images/careers/architecture-engineering/energy-engineers-except-wind-and-solar.jpg',
    '17-2199.05': '/images/careers/architecture-engineering/mechatronics-engineers.jpg',
    '17-2199.06': '/images/careers/architecture-engineering/microsystems-engineers.jpg',
    '17-2199.07': '/images/careers/architecture-engineering/photonics-engineers.jpg',
    '17-2199.08': '/images/careers/architecture-engineering/robotics-engineers.jpg',
    '17-2199.09': '/images/careers/architecture-engineering/nanosystems-engineers.jpg',
    '17-2199.10': '/images/careers/architecture-engineering/wind-energy-engineers.jpg',
    '17-2199.11': '/images/careers/architecture-engineering/solar-energy-systems-engineers.jpg',
    '17-3011.00': '/images/careers/architecture-engineering/architectural-and-civil-drafters.jpg',
    '17-3012.00': '/images/careers/architecture-engineering/electrical-and-electronics-drafters.jpg',
    '17-3013.00': '/images/careers/architecture-engineering/mechanical-drafters.jpg',
    '17-3021.00': '/images/careers/architecture-engineering/aerospace-engineering-and-operations-technologists-and-techn.jpg',
    '17-3022.00': '/images/careers/architecture-engineering/civil-engineering-technologists-and-technicians.jpg',
    '17-3023.00': '/images/careers/architecture-engineering/electrical-and-electronic-engineering-technologists-and-tech.jpg',
    '17-3024.00': '/images/careers/architecture-engineering/electro-mechanical-and-mechatronics-technologists-and-techni.jpg',
    '17-3024.01': '/images/careers/architecture-engineering/robotics-technicians.jpg',
    '17-3025.00': '/images/careers/architecture-engineering/environmental-engineering-technologists-and-technicians.jpg',
    '17-3026.00': '/images/careers/architecture-engineering/industrial-engineering-technologists-and-technicians.jpg',
    '17-3026.01': '/images/careers/architecture-engineering/nanotechnology-engineering-technologists-and-technicians.jpg',
    '17-3027.00': '/images/careers/architecture-engineering/mechanical-engineering-technologists-and-technicians.jpg',
    '17-3027.01': '/images/careers/architecture-engineering/automotive-engineering-technicians.jpg',
    '17-3028.00': '/images/careers/architecture-engineering/calibration-technologists-and-technicians.jpg',
    '17-3029.00': '/images/careers/architecture-engineering/engineering-technologists-and-technicians-except-drafters-al.jpg',
    '17-3029.01': '/images/careers/architecture-engineering/non-destructive-testing-specialists.jpg',
    '17-3029.08': '/images/careers/architecture-engineering/photonics-technicians.jpg',
    '17-3031.00': '/images/careers/architecture-engineering/surveying-and-mapping-technicians.jpg',
    // ── ARTS MEDIA ──
    '27-1011.00': '/images/careers/arts-media/art-directors.jpg',
    '27-1012.00': '/images/careers/arts-media/craft-artists.jpg',
    '27-1013.00': '/images/careers/arts-media/fine-artists-including-painters-sculptors-and-illustrators.jpg',
    '27-1014.00': '/images/careers/arts-media/special-effects-artists-and-animators.jpg',
    '27-1019.00': '/images/careers/arts-media/artists-and-related-workers-all-other.jpg',
    '27-1021.00': '/images/careers/arts-media/commercial-and-industrial-designers.jpg',
    '27-1022.00': '/images/careers/arts-media/fashion-designers.jpg',
    '27-1023.00': '/images/careers/arts-media/floral-designers.jpg',
    '27-1024.00': '/images/careers/arts-media/graphic-designers.jpg',
    '27-1025.00': '/images/careers/arts-media/interior-designers.jpg',
    '27-1026.00': '/images/careers/arts-media/merchandise-displayers-and-window-trimmers.jpg',
    '27-1027.00': '/images/careers/arts-media/set-and-exhibit-designers.jpg',
    '27-1029.00': '/images/careers/arts-media/designers-all-other.jpg',
    '27-2011.00': '/images/careers/arts-media/actors.jpg',
    '27-2012.00': '/images/careers/arts-media/producers-and-directors.jpg',
    '27-2012.03': '/images/careers/arts-media/media-programming-directors.jpg',
    '27-2012.04': '/images/careers/arts-media/talent-directors.jpg',
    '27-2012.05': '/images/careers/arts-media/media-technical-directorsmanagers.jpg',
    '27-2021.00': '/images/careers/arts-media/athletes-and-sports-competitors.jpg',
    '27-2022.00': '/images/careers/arts-media/coaches-and-scouts.jpg',
    '27-2023.00': '/images/careers/arts-media/umpires-referees-and-other-sports-officials.jpg',
    '27-2031.00': '/images/careers/arts-media/dancers.jpg',
    '27-2032.00': '/images/careers/arts-media/choreographers.jpg',
    '27-2041.00': '/images/careers/arts-media/music-directors-and-composers.jpg',
    '27-2042.00': '/images/careers/arts-media/musicians-and-singers.jpg',
    '27-2091.00': '/images/careers/arts-media/disc-jockeys-except-radio.jpg',
    '27-2099.00': '/images/careers/arts-media/entertainers-and-performers-sports-and-related-workers-all-o.jpg',
    '27-3011.00': '/images/careers/arts-media/broadcast-announcers-and-radio-disc-jockeys.jpg',
    '27-3023.00': '/images/careers/arts-media/news-analysts-reporters-and-journalists.jpg',
    '27-3031.00': '/images/careers/arts-media/public-relations-specialists.jpg',
    '27-3041.00': '/images/careers/arts-media/editors.jpg',
    '27-3042.00': '/images/careers/arts-media/technical-writers.jpg',
    '27-3043.00': '/images/careers/arts-media/writers-and-authors.jpg',
    '27-3043.05': '/images/careers/arts-media/poets-lyricists-and-creative-writers.jpg',
    '27-3091.00': '/images/careers/arts-media/interpreters-and-translators.jpg',
    '27-3092.00': '/images/careers/arts-media/court-reporters-and-simultaneous-captioners.jpg',
    '27-3099.00': '/images/careers/arts-media/media-and-communication-workers-all-other.jpg',
    '27-4011.00': '/images/careers/arts-media/audio-and-video-technicians.jpg',
    '27-4012.00': '/images/careers/arts-media/broadcast-technicians.jpg',
    '27-4014.00': '/images/careers/arts-media/sound-engineering-technicians.jpg',
    '27-4015.00': '/images/careers/arts-media/lighting-technicians.jpg',
    '27-4021.00': '/images/careers/arts-media/photographers.jpg',
    '27-4031.00': '/images/careers/arts-media/camera-operators-television-video-and-film.jpg',
    '27-4032.00': '/images/careers/arts-media/film-and-video-editors.jpg',
    '27-4099.00': '/images/careers/arts-media/media-and-communication-equipment-workers-all-other.jpg',
    // ── BUILDING MAINTENANCE ──
    '37-1011.00': '/images/careers/building-maintenance/housekeeping-supervisor.jpg',
    '37-1012.00': '/images/careers/building-maintenance/landscaping-supervisor.jpg',
    '37-2011.00': '/images/careers/building-maintenance/janitor.jpg',
    '37-2012.00': '/images/careers/building-maintenance/maid.jpg',
    '37-2021.00': '/images/careers/building-maintenance/pest-control.jpg',
    '37-3011.00': '/images/careers/building-maintenance/landscaping-worker.jpg',
    '37-3012.00': '/images/careers/building-maintenance/pesticide-sprayer.jpg',
    '37-3013.00': '/images/careers/building-maintenance/tree-trimmer.jpg',
    // ── BUSINESS FINANCE ──
    '13-1011.00': '/images/careers/business-finance/agents-and-business-managers-of-artists-performers-and-athle.jpg',
    '13-1021.00': '/images/careers/business-finance/buyers-and-purchasing-agents-farm-products.jpg',
    '13-1022.00': '/images/careers/business-finance/wholesale-and-retail-buyers-except-farm-products.jpg',
    '13-1023.00': '/images/careers/business-finance/purchasing-agents-except-wholesale-retail-and-farm-products.jpg',
    '13-1031.00': '/images/careers/business-finance/claims-adjusters-examiners-and-investigators.jpg',
    '13-1032.00': '/images/careers/business-finance/insurance-appraisers-auto-damage.jpg',
    '13-1041.00': '/images/careers/business-finance/compliance-officers.jpg',
    '13-1041.01': '/images/careers/business-finance/environmental-compliance-inspectors.jpg',
    '13-1041.03': '/images/careers/business-finance/equal-opportunity-representatives-and-officers.jpg',
    '13-1041.04': '/images/careers/business-finance/government-property-inspectors-and-investigators.jpg',
    '13-1041.06': '/images/careers/business-finance/coroners.jpg',
    '13-1041.07': '/images/careers/business-finance/regulatory-affairs-specialists.jpg',
    '13-1041.08': '/images/careers/business-finance/customs-brokers.jpg',
    '13-1051.00': '/images/careers/business-finance/cost-estimators.jpg',
    '13-1071.00': '/images/careers/business-finance/human-resources-specialists.jpg',
    '13-1074.00': '/images/careers/business-finance/farm-labor-contractors.jpg',
    '13-1075.00': '/images/careers/business-finance/labor-relations-specialists.jpg',
    '13-1081.00': '/images/careers/business-finance/logisticians.jpg',
    '13-1081.01': '/images/careers/business-finance/logistics-engineers.jpg',
    '13-1081.02': '/images/careers/business-finance/logistics-analysts.jpg',
    '13-1082.00': '/images/careers/business-finance/project-management-specialists.jpg',
    '13-1111.00': '/images/careers/business-finance/management-analysts.jpg',
    '13-1121.00': '/images/careers/business-finance/meeting-convention-and-event-planners.jpg',
    '13-1131.00': '/images/careers/business-finance/fundraisers.jpg',
    '13-1141.00': '/images/careers/business-finance/compensation-benefits-and-job-analysis-specialists.jpg',
    '13-1151.00': '/images/careers/business-finance/training-and-development-specialists.jpg',
    '13-1161.00': '/images/careers/business-finance/market-research-analysts-and-marketing-specialists.jpg',
    '13-1161.01': '/images/careers/business-finance/search-marketing-strategists.jpg',
    '13-1199.00': '/images/careers/business-finance/business-operations-specialists-all-other.jpg',
    '13-1199.04': '/images/careers/business-finance/business-continuity-planners.jpg',
    '13-1199.05': '/images/careers/business-finance/sustainability-specialists.jpg',
    '13-1199.06': '/images/careers/business-finance/online-merchants.jpg',
    '13-1199.07': '/images/careers/business-finance/security-management-specialists.jpg',
    '13-2011.00': '/images/careers/business-finance/accountants-and-auditors.jpg',
    '13-2022.00': '/images/careers/business-finance/appraisers-of-personal-and-business-property.jpg',
    '13-2023.00': '/images/careers/business-finance/appraisers-and-assessors-of-real-estate.jpg',
    '13-2031.00': '/images/careers/business-finance/budget-analysts.jpg',
    '13-2041.00': '/images/careers/business-finance/credit-analysts.jpg',
    '13-2051.00': '/images/careers/business-finance/financial-and-investment-analysts.jpg',
    '13-2052.00': '/images/careers/business-finance/personal-financial-advisors.jpg',
    '13-2053.00': '/images/careers/business-finance/insurance-underwriters.jpg',
    '13-2054.00': '/images/careers/business-finance/financial-risk-specialists.jpg',
    '13-2061.00': '/images/careers/business-finance/financial-examiners.jpg',
    '13-2071.00': '/images/careers/business-finance/credit-counselors.jpg',
    '13-2072.00': '/images/careers/business-finance/loan-officers.jpg',
    '13-2081.00': '/images/careers/business-finance/tax-examiners-and-collectors-and-revenue-agents.jpg',
    '13-2082.00': '/images/careers/business-finance/tax-preparers.jpg',
    '13-2099.00': '/images/careers/business-finance/financial-specialists-all-other.jpg',
    '13-2099.01': '/images/careers/business-finance/financial-quantitative-analysts.jpg',
    '13-2099.04': '/images/careers/business-finance/fraud-examiners-investigators-and-analysts.jpg',
    // ── COMMUNITY SOCIAL ──
    '21-1011.00': '/images/careers/community-social/substance-abuse-and-behavioral-disorder-counselors.jpg',
    '21-1012.00': '/images/careers/community-social/educational-guidance-and-career-counselors-and-advisors.jpg',
    '21-1013.00': '/images/careers/community-social/marriage-and-family-therapists.jpg',
    '21-1014.00': '/images/careers/community-social/mental-health-counselors.jpg',
    '21-1015.00': '/images/careers/community-social/rehabilitation-counselors.jpg',
    '21-1019.00': '/images/careers/community-social/counselors-all-other.jpg',
    '21-1021.00': '/images/careers/community-social/child-family-and-school-social-workers.jpg',
    '21-1022.00': '/images/careers/community-social/healthcare-social-workers.jpg',
    '21-1023.00': '/images/careers/community-social/mental-health-and-substance-abuse-social-workers.jpg',
    '21-1029.00': '/images/careers/community-social/social-workers-all-other.jpg',
    '21-1091.00': '/images/careers/community-social/health-education-specialists.jpg',
    '21-1092.00': '/images/careers/community-social/probation-officers-and-correctional-treatment-specialists.jpg',
    '21-1093.00': '/images/careers/community-social/social-and-human-service-assistants.jpg',
    '21-1094.00': '/images/careers/community-social/community-health-workers.jpg',
    '21-1099.00': '/images/careers/community-social/community-and-social-service-specialists-all-other.jpg',
    '21-2011.00': '/images/careers/community-social/clergy.jpg',
    '21-2021.00': '/images/careers/community-social/directors-religious-activities-and-education.jpg',
    // ── COMPUTER MATH ──
    '15-1211.00': '/images/careers/computer-math/computer-systems-analyst.jpg',
    '15-1211.01': '/images/careers/computer-math/health-informatics-specialist.jpg',
    '15-1212.00': '/images/careers/computer-math/information-security-analyst.jpg',
    '15-1221.00': '/images/careers/computer-math/computer-research-scientist.jpg',
    '15-1231.00': '/images/careers/computer-math/network-support-specialist.jpg',
    '15-1232.00': '/images/careers/computer-math/computer-user-support.jpg',
    '15-1241.00': '/images/careers/computer-math/network-architect.jpg',
    '15-1241.01': '/images/careers/computer-math/telecom-engineering-specialist.jpg',
    '15-1242.00': '/images/careers/computer-math/database-administrator.jpg',
    '15-1243.00': '/images/careers/computer-math/database-architect.jpg',
    '15-1243.01': '/images/careers/computer-math/data-warehousing-specialist.jpg',
    '15-1244.00': '/images/careers/computer-math/network-systems-administrator.jpg',
    '15-1251.00': '/images/careers/computer-math/computer-programmer.jpg',
    '15-1252.00': '/images/careers/computer-math/software-developer.jpg',
    '15-1253.00': '/images/careers/computer-math/software-qa-analyst.jpg',
    '15-1254.00': '/images/careers/computer-math/web-developer.jpg',
    '15-1255.00': '/images/careers/computer-math/web-interface-designer.jpg',
    '15-1255.01': '/images/careers/computer-math/video-game-designer.jpg',
    '15-1299.01': '/images/careers/computer-math/web-administrator.jpg',
    '15-1299.02': '/images/careers/computer-math/gis-technologist.jpg',
    '15-1299.03': '/images/careers/computer-math/document-management-specialist.jpg',
    '15-1299.04': '/images/careers/computer-math/penetration-tester.jpg',
    '15-1299.05': '/images/careers/computer-math/information-security-engineer.jpg',
    '15-1299.06': '/images/careers/computer-math/digital-forensics-analyst.jpg',
    '15-1299.07': '/images/careers/computer-math/blockchain-engineer.jpg',
    '15-1299.08': '/images/careers/computer-math/computer-systems-engineer.jpg',
    '15-1299.09': '/images/careers/computer-math/it-project-manager.jpg',
    '15-2011.00': '/images/careers/computer-math/actuary.jpg',
    '15-2021.00': '/images/careers/computer-math/mathematician.jpg',
    '15-2031.00': '/images/careers/computer-math/operations-research-analyst.jpg',
    '15-2041.00': '/images/careers/computer-math/statistician.jpg',
    '15-2041.01': '/images/careers/computer-math/biostatistician.jpg',
    '15-2051.00': '/images/careers/computer-math/data-scientist.jpg',
    '15-2051.01': '/images/careers/computer-math/business-intelligence-analyst.jpg',
    '15-2051.02': '/images/careers/computer-math/clinical-data-manager.jpg',
    '15-2099.00': '/images/careers/computer-math/math-science-occupations.jpg',
    '15-2099.01': '/images/careers/computer-math/bioinformatics-technician.jpg',
    // ── CONSTRUCTION ──
    '47-1011.00': '/images/careers/construction/first-line-supervisors-of-construction-trades-and-extraction.jpg',
    '47-1011.03': '/images/careers/construction/solar-energy-installation-managers.jpg',
    '47-2011.00': '/images/careers/construction/boilermakers.jpg',
    '47-2021.00': '/images/careers/construction/brickmasons-and-blockmasons.jpg',
    '47-2022.00': '/images/careers/construction/stonemasons.jpg',
    '47-2031.00': '/images/careers/construction/carpenters.jpg',
    '47-2041.00': '/images/careers/construction/carpet-installers.jpg',
    '47-2042.00': '/images/careers/construction/floor-layers-except-carpet-wood-and-hard-tiles.jpg',
    '47-2043.00': '/images/careers/construction/floor-sanders-and-finishers.jpg',
    '47-2044.00': '/images/careers/construction/tile-and-stone-setters.jpg',
    '47-2051.00': '/images/careers/construction/cement-masons-and-concrete-finishers.jpg',
    '47-2053.00': '/images/careers/construction/terrazzo-workers-and-finishers.jpg',
    '47-2061.00': '/images/careers/construction/construction-laborers.jpg',
    '47-2071.00': '/images/careers/construction/paving-surfacing-and-tamping-equipment-operators.jpg',
    '47-2072.00': '/images/careers/construction/pile-driver-operators.jpg',
    '47-2073.00': '/images/careers/construction/operating-engineers-and-other-construction-equipment-operato.jpg',
    '47-2081.00': '/images/careers/construction/drywall-and-ceiling-tile-installers.jpg',
    '47-2082.00': '/images/careers/construction/tapers.jpg',
    '47-2111.00': '/images/careers/construction/electricians.jpg',
    '47-2121.00': '/images/careers/construction/glaziers.jpg',
    '47-2131.00': '/images/careers/construction/insulation-workers-floor-ceiling-and-wall.jpg',
    '47-2132.00': '/images/careers/construction/insulation-workers-mechanical.jpg',
    '47-2141.00': '/images/careers/construction/painters-construction-and-maintenance.jpg',
    '47-2142.00': '/images/careers/construction/paperhangers.jpg',
    '47-2151.00': '/images/careers/construction/pipelayers.jpg',
    '47-2152.00': '/images/careers/construction/plumbers-pipefitters-and-steamfitters.jpg',
    '47-2152.04': '/images/careers/construction/solar-thermal-installers-and-technicians.jpg',
    '47-2161.00': '/images/careers/construction/plasterers-and-stucco-masons.jpg',
    '47-2171.00': '/images/careers/construction/reinforcing-iron-and-rebar-workers.jpg',
    '47-2181.00': '/images/careers/construction/roofers.jpg',
    '47-2211.00': '/images/careers/construction/sheet-metal-workers.jpg',
    '47-2221.00': '/images/careers/construction/structural-iron-and-steel-workers.jpg',
    '47-2231.00': '/images/careers/construction/solar-photovoltaic-installers.jpg',
    '47-3011.00': '/images/careers/construction/helpers-brickmasons-blockmasons-stonemasons-and-tile-and-mar.jpg',
    '47-3012.00': '/images/careers/construction/helpers-carpenters.jpg',
    '47-3013.00': '/images/careers/construction/helpers-electricians.jpg',
    '47-3014.00': '/images/careers/construction/helpers-painters-paperhangers-plasterers-and-stucco-masons.jpg',
    '47-3015.00': '/images/careers/construction/helpers-pipelayers-plumbers-pipefitters-and-steamfitters.jpg',
    '47-3016.00': '/images/careers/construction/helpers-roofers.jpg',
    '47-3019.00': '/images/careers/construction/helpers-construction-trades-all-other.jpg',
    '47-4011.00': '/images/careers/construction/construction-and-building-inspectors.jpg',
    '47-4011.01': '/images/careers/construction/energy-auditors.jpg',
    '47-4021.00': '/images/careers/construction/elevator-and-escalator-installers-and-repairers.jpg',
    '47-4031.00': '/images/careers/construction/fence-erectors.jpg',
    '47-4041.00': '/images/careers/construction/hazardous-materials-removal-workers.jpg',
    '47-4051.00': '/images/careers/construction/highway-maintenance-workers.jpg',
    '47-4061.00': '/images/careers/construction/rail-track-laying-and-maintenance-equipment-operators.jpg',
    '47-4071.00': '/images/careers/construction/septic-tank-servicers-and-sewer-pipe-cleaners.jpg',
    '47-4091.00': '/images/careers/construction/segmental-pavers.jpg',
    '47-4099.03': '/images/careers/construction/weatherization-installers-and-technicians.jpg',
    '47-5011.00': '/images/careers/construction/derrick-operators-oil-and-gas.jpg',
    '47-5012.00': '/images/careers/construction/rotary-drill-operators-oil-and-gas.jpg',
    '47-5013.00': '/images/careers/construction/service-unit-operators-oil-and-gas.jpg',
    '47-5022.00': '/images/careers/construction/excavating-and-loading-machine-and-dragline-operators-surfac.jpg',
    '47-5023.00': '/images/careers/construction/earth-drillers-except-oil-and-gas.jpg',
    '47-5032.00': '/images/careers/construction/explosives-workers-ordnance-handling-experts-and-blasters.jpg',
    '47-5041.00': '/images/careers/construction/continuous-mining-machine-operators.jpg',
    '47-5043.00': '/images/careers/construction/roof-bolters-mining.jpg',
    '47-5044.00': '/images/careers/construction/loading-and-moving-machine-operators-underground-mining.jpg',
    '47-5051.00': '/images/careers/construction/rock-splitters-quarry.jpg',
    '47-5071.00': '/images/careers/construction/roustabouts-oil-and-gas.jpg',
    '47-5081.00': '/images/careers/construction/helpers-extraction-workers.jpg',
    // ── EDUCATION ──
    '25-1011.00': '/images/careers/education/business-teachers-postsecondary.jpg',
    '25-1021.00': '/images/careers/education/computer-science-teachers-postsecondary.jpg',
    '25-1022.00': '/images/careers/education/mathematical-science-teachers-postsecondary.jpg',
    '25-1031.00': '/images/careers/education/architecture-teachers-postsecondary.jpg',
    '25-1032.00': '/images/careers/education/engineering-teachers-postsecondary.jpg',
    '25-1041.00': '/images/careers/education/agricultural-sciences-teachers-postsecondary.jpg',
    '25-1042.00': '/images/careers/education/biological-science-teachers-postsecondary.jpg',
    '25-1043.00': '/images/careers/education/forestry-and-conservation-science-teachers-postsecondary.jpg',
    '25-1051.00': '/images/careers/education/atmospheric-earth-marine-and-space-sciences-teachers-postsec.jpg',
    '25-1052.00': '/images/careers/education/chemistry-teachers-postsecondary.jpg',
    '25-1053.00': '/images/careers/education/environmental-science-teachers-postsecondary.jpg',
    '25-1054.00': '/images/careers/education/physics-teachers-postsecondary.jpg',
    '25-1061.00': '/images/careers/education/anthropology-and-archeology-teachers-postsecondary.jpg',
    '25-1062.00': '/images/careers/education/area-ethnic-and-cultural-studies-teachers-postsecondary.jpg',
    '25-1063.00': '/images/careers/education/economics-teachers-postsecondary.jpg',
    '25-1064.00': '/images/careers/education/geography-teachers-postsecondary.jpg',
    '25-1065.00': '/images/careers/education/political-science-teachers-postsecondary.jpg',
    '25-1066.00': '/images/careers/education/psychology-teachers-postsecondary.jpg',
    '25-1067.00': '/images/careers/education/sociology-teachers-postsecondary.jpg',
    '25-1071.00': '/images/careers/education/health-specialties-teachers-postsecondary.jpg',
    '25-1072.00': '/images/careers/education/nursing-instructors-and-teachers-postsecondary.jpg',
    '25-1081.00': '/images/careers/education/education-teachers-postsecondary.jpg',
    '25-1082.00': '/images/careers/education/library-science-teachers-postsecondary.jpg',
    '25-1111.00': '/images/careers/education/criminal-justice-and-law-enforcement-teachers-postsecondary.jpg',
    '25-1112.00': '/images/careers/education/law-teachers-postsecondary.jpg',
    '25-1113.00': '/images/careers/education/social-work-teachers-postsecondary.jpg',
    '25-1121.00': '/images/careers/education/art-drama-and-music-teachers-postsecondary.jpg',
    '25-1122.00': '/images/careers/education/communications-teachers-postsecondary.jpg',
    '25-1123.00': '/images/careers/education/english-language-and-literature-teachers-postsecondary.jpg',
    '25-1124.00': '/images/careers/education/foreign-language-and-literature-teachers-postsecondary.jpg',
    '25-1125.00': '/images/careers/education/history-teachers-postsecondary.jpg',
    '25-1126.00': '/images/careers/education/philosophy-and-religion-teachers-postsecondary.jpg',
    '25-1192.00': '/images/careers/education/family-and-consumer-sciences-teachers-postsecondary.jpg',
    '25-1193.00': '/images/careers/education/recreation-and-fitness-studies-teachers-postsecondary.jpg',
    '25-1194.00': '/images/careers/education/careertechnical-education-teachers-postsecondary.jpg',
    '25-1199.00': '/images/careers/education/postsecondary-teachers-all-other.jpg',
    '25-2011.00': '/images/careers/education/preschool-teachers-except-special-education.jpg',
    '25-2012.00': '/images/careers/education/kindergarten-teachers-except-special-education.jpg',
    '25-2021.00': '/images/careers/education/elementary-school-teachers-except-special-education.jpg',
    '25-2022.00': '/images/careers/education/middle-school-teachers-except-special-and-careertechnical-ed.jpg',
    '25-2023.00': '/images/careers/education/careertechnical-education-teachers-middle-school.jpg',
    '25-2031.00': '/images/careers/education/secondary-school-teachers-except-special-and-careertechnical.jpg',
    '25-2032.00': '/images/careers/education/careertechnical-education-teachers-secondary-school.jpg',
    '25-2051.00': '/images/careers/education/special-education-teachers-preschool.jpg',
    '25-2055.00': '/images/careers/education/special-education-teachers-kindergarten.jpg',
    '25-2056.00': '/images/careers/education/special-education-teachers-elementary-school.jpg',
    '25-2057.00': '/images/careers/education/special-education-teachers-middle-school.jpg',
    '25-2058.00': '/images/careers/education/special-education-teachers-secondary-school.jpg',
    '25-2059.01': '/images/careers/education/adapted-physical-education-specialists.jpg',
    '25-3011.00': '/images/careers/education/adult-basic-education-adult-secondary-education-and-english-.jpg',
    '25-3021.00': '/images/careers/education/self-enrichment-teachers.jpg',
    '25-3031.00': '/images/careers/education/substitute-teachers-short-term.jpg',
    '25-3041.00': '/images/careers/education/tutors.jpg',
    '25-3099.00': '/images/careers/education/teachers-and-instructors-all-other.jpg',
    '25-4011.00': '/images/careers/education/archivists.jpg',
    '25-4012.00': '/images/careers/education/curators.jpg',
    '25-4013.00': '/images/careers/education/museum-technicians-and-conservators.jpg',
    '25-4022.00': '/images/careers/education/librarians-and-media-collections-specialists.jpg',
    '25-4031.00': '/images/careers/education/library-technicians.jpg',
    '25-9021.00': '/images/careers/education/farm-and-home-management-educators.jpg',
    '25-9031.00': '/images/careers/education/instructional-coordinators.jpg',
    '25-9042.00': '/images/careers/education/teaching-assistants-preschool-elementary-middle-and-secondar.jpg',
    '25-9043.00': '/images/careers/education/teaching-assistants-special-education.jpg',
    '25-9044.00': '/images/careers/education/teaching-assistants-postsecondary.jpg',
    // ── FARMING FORESTRY ──
    '45-1011.00': '/images/careers/farming-forestry/first-line-supervisors-of-farming-fishing-and-forestry-worke.jpg',
    '45-2011.00': '/images/careers/farming-forestry/agricultural-inspectors.jpg',
    '45-2021.00': '/images/careers/farming-forestry/animal-breeders.jpg',
    '45-2041.00': '/images/careers/farming-forestry/graders-and-sorters-agricultural-products.jpg',
    '45-2091.00': '/images/careers/farming-forestry/agricultural-equipment-operators.jpg',
    '45-2092.00': '/images/careers/farming-forestry/farmworkers-and-laborers-crop-nursery-and-greenhouse.jpg',
    '45-2093.00': '/images/careers/farming-forestry/farmworkers-farm-ranch-and-aquacultural-animals.jpg',
    '45-2099.00': '/images/careers/farming-forestry/agricultural-workers-all-other.jpg',
    '45-3031.00': '/images/careers/farming-forestry/fishing-and-hunting-workers.jpg',
    '45-4011.00': '/images/careers/farming-forestry/forest-and-conservation-workers.jpg',
    '45-4021.00': '/images/careers/farming-forestry/fallers.jpg',
    '45-4022.00': '/images/careers/farming-forestry/logging-equipment-operators.jpg',
    '45-4023.00': '/images/careers/farming-forestry/log-graders-and-scalers.jpg',
    // ── FOOD SERVICE ──
    '35-1011.00': '/images/careers/food-service/chefs-and-head-cooks.jpg',
    '35-1012.00': '/images/careers/food-service/first-line-supervisors-of-food-preparation-and-serving-worke.jpg',
    '35-2011.00': '/images/careers/food-service/cooks-fast-food.jpg',
    '35-2012.00': '/images/careers/food-service/cooks-institution-and-cafeteria.jpg',
    '35-2013.00': '/images/careers/food-service/cooks-private-household.jpg',
    '35-2014.00': '/images/careers/food-service/cooks-restaurant.jpg',
    '35-2015.00': '/images/careers/food-service/cooks-short-order.jpg',
    '35-2021.00': '/images/careers/food-service/food-preparation-workers.jpg',
    '35-3011.00': '/images/careers/food-service/bartenders.jpg',
    '35-3023.00': '/images/careers/food-service/fast-food-and-counter-workers.jpg',
    '35-3023.01': '/images/careers/food-service/baristas.jpg',
    '35-3031.00': '/images/careers/food-service/waiters-and-waitresses.jpg',
    '35-3041.00': '/images/careers/food-service/food-servers-nonrestaurant.jpg',
    '35-9011.00': '/images/careers/food-service/dining-room-and-cafeteria-attendants-and-bartender-helpers.jpg',
    '35-9021.00': '/images/careers/food-service/dishwashers.jpg',
    '35-9031.00': '/images/careers/food-service/hosts-and-hostesses-restaurant-lounge-and-coffee-shop.jpg',
    '35-9099.00': '/images/careers/food-service/food-preparation-and-serving-related-workers-all-other.jpg',
    // ── HEALTHCARE PRACTITIONERS ──
    '29-1011.00': '/images/careers/healthcare-practitioners/chiropractors.jpg',
    '29-1021.00': '/images/careers/healthcare-practitioners/dentists-general.jpg',
    '29-1022.00': '/images/careers/healthcare-practitioners/oral-and-maxillofacial-surgeons.jpg',
    '29-1023.00': '/images/careers/healthcare-practitioners/orthodontists.jpg',
    '29-1024.00': '/images/careers/healthcare-practitioners/prosthodontists.jpg',
    '29-1031.00': '/images/careers/healthcare-practitioners/dietitians-and-nutritionists.jpg',
    '29-1041.00': '/images/careers/healthcare-practitioners/optometrists.jpg',
    '29-1051.00': '/images/careers/healthcare-practitioners/pharmacists.jpg',
    '29-1071.00': '/images/careers/healthcare-practitioners/physician-assistants.jpg',
    '29-1071.01': '/images/careers/healthcare-practitioners/anesthesiologist-assistants.jpg',
    '29-1081.00': '/images/careers/healthcare-practitioners/podiatrists.jpg',
    '29-1122.00': '/images/careers/healthcare-practitioners/occupational-therapists.jpg',
    '29-1122.01': '/images/careers/healthcare-practitioners/low-vision-therapists-orientation-and-mobility-specialists-a.jpg',
    '29-1123.00': '/images/careers/healthcare-practitioners/physical-therapists.jpg',
    '29-1124.00': '/images/careers/healthcare-practitioners/radiation-therapists.jpg',
    '29-1125.00': '/images/careers/healthcare-practitioners/recreational-therapists.jpg',
    '29-1126.00': '/images/careers/healthcare-practitioners/respiratory-therapists.jpg',
    '29-1127.00': '/images/careers/healthcare-practitioners/speech-language-pathologists.jpg',
    '29-1128.00': '/images/careers/healthcare-practitioners/exercise-physiologists.jpg',
    '29-1129.00': '/images/careers/healthcare-practitioners/therapists-all-other.jpg',
    '29-1129.01': '/images/careers/healthcare-practitioners/art-therapists.jpg',
    '29-1129.02': '/images/careers/healthcare-practitioners/music-therapists.jpg',
    '29-1131.00': '/images/careers/healthcare-practitioners/veterinarians.jpg',
    '29-1141.00': '/images/careers/healthcare-practitioners/registered-nurses.jpg',
    '29-1141.01': '/images/careers/healthcare-practitioners/acute-care-nurses.jpg',
    '29-1141.02': '/images/careers/healthcare-practitioners/advanced-practice-psychiatric-nurses.jpg',
    '29-1141.03': '/images/careers/healthcare-practitioners/critical-care-nurses.jpg',
    '29-1141.04': '/images/careers/healthcare-practitioners/clinical-nurse-specialists.jpg',
    '29-1151.00': '/images/careers/healthcare-practitioners/nurse-anesthetists.jpg',
    '29-1161.00': '/images/careers/healthcare-practitioners/nurse-midwives.jpg',
    '29-1171.00': '/images/careers/healthcare-practitioners/nurse-practitioners.jpg',
    '29-1181.00': '/images/careers/healthcare-practitioners/audiologists.jpg',
    '29-1211.00': '/images/careers/healthcare-practitioners/anesthesiologists.jpg',
    '29-1212.00': '/images/careers/healthcare-practitioners/cardiologists.jpg',
    '29-1213.00': '/images/careers/healthcare-practitioners/dermatologists.jpg',
    '29-1214.00': '/images/careers/healthcare-practitioners/emergency-medicine-physicians.jpg',
    '29-1215.00': '/images/careers/healthcare-practitioners/family-medicine-physicians.jpg',
    '29-1216.00': '/images/careers/healthcare-practitioners/general-internal-medicine-physicians.jpg',
    '29-1217.00': '/images/careers/healthcare-practitioners/neurologists.jpg',
    '29-1218.00': '/images/careers/healthcare-practitioners/obstetricians-and-gynecologists.jpg',
    '29-1221.00': '/images/careers/healthcare-practitioners/pediatricians-general.jpg',
    '29-1222.00': '/images/careers/healthcare-practitioners/physicians-pathologists.jpg',
    '29-1223.00': '/images/careers/healthcare-practitioners/psychiatrists.jpg',
    '29-1224.00': '/images/careers/healthcare-practitioners/radiologists.jpg',
    '29-1229.01': '/images/careers/healthcare-practitioners/allergists-and-immunologists.jpg',
    '29-1229.02': '/images/careers/healthcare-practitioners/hospitalists.jpg',
    '29-1229.03': '/images/careers/healthcare-practitioners/urologists.jpg',
    '29-1229.04': '/images/careers/healthcare-practitioners/physical-medicine-and-rehabilitation-physicians.jpg',
    '29-1229.05': '/images/careers/healthcare-practitioners/preventive-medicine-physicians.jpg',
    '29-1229.06': '/images/careers/healthcare-practitioners/sports-medicine-physicians.jpg',
    '29-1241.00': '/images/careers/healthcare-practitioners/ophthalmologists-except-pediatric.jpg',
    '29-1242.00': '/images/careers/healthcare-practitioners/orthopedic-surgeons-except-pediatric.jpg',
    '29-1243.00': '/images/careers/healthcare-practitioners/pediatric-surgeons.jpg',
    '29-1291.00': '/images/careers/healthcare-practitioners/acupuncturists.jpg',
    '29-1292.00': '/images/careers/healthcare-practitioners/dental-hygienists.jpg',
    '29-1299.01': '/images/careers/healthcare-practitioners/naturopathic-physicians.jpg',
    '29-1299.02': '/images/careers/healthcare-practitioners/orthoptists.jpg',
    '29-2011.00': '/images/careers/healthcare-practitioners/medical-and-clinical-laboratory-technologists.jpg',
    '29-2011.01': '/images/careers/healthcare-practitioners/cytogenetic-technologists.jpg',
    '29-2011.02': '/images/careers/healthcare-practitioners/cytotechnologists.jpg',
    '29-2011.04': '/images/careers/healthcare-practitioners/histotechnologists.jpg',
    '29-2012.00': '/images/careers/healthcare-practitioners/medical-and-clinical-laboratory-technicians.jpg',
    '29-2012.01': '/images/careers/healthcare-practitioners/histology-technicians.jpg',
    '29-2031.00': '/images/careers/healthcare-practitioners/cardiovascular-technologists-and-technicians.jpg',
    '29-2032.00': '/images/careers/healthcare-practitioners/diagnostic-medical-sonographers.jpg',
    '29-2033.00': '/images/careers/healthcare-practitioners/nuclear-medicine-technologists.jpg',
    '29-2034.00': '/images/careers/healthcare-practitioners/radiologic-technologists-and-technicians.jpg',
    '29-2035.00': '/images/careers/healthcare-practitioners/magnetic-resonance-imaging-technologists.jpg',
    '29-2036.00': '/images/careers/healthcare-practitioners/medical-dosimetrists.jpg',
    '29-2042.00': '/images/careers/healthcare-practitioners/emergency-medical-technicians.jpg',
    '29-2043.00': '/images/careers/healthcare-practitioners/paramedics.jpg',
    '29-2051.00': '/images/careers/healthcare-practitioners/dietetic-technicians.jpg',
    '29-2052.00': '/images/careers/healthcare-practitioners/pharmacy-technicians.jpg',
    '29-2053.00': '/images/careers/healthcare-practitioners/psychiatric-technicians.jpg',
    '29-2055.00': '/images/careers/healthcare-practitioners/surgical-technologists.jpg',
    '29-2056.00': '/images/careers/healthcare-practitioners/veterinary-technologists-and-technicians.jpg',
    '29-2057.00': '/images/careers/healthcare-practitioners/ophthalmic-medical-technicians.jpg',
    '29-2061.00': '/images/careers/healthcare-practitioners/licensed-practical-and-licensed-vocational-nurses.jpg',
    '29-2072.00': '/images/careers/healthcare-practitioners/medical-records-specialists.jpg',
    '29-2081.00': '/images/careers/healthcare-practitioners/opticians-dispensing.jpg',
    '29-2091.00': '/images/careers/healthcare-practitioners/orthotists-and-prosthetists.jpg',
    '29-2092.00': '/images/careers/healthcare-practitioners/hearing-aid-specialists.jpg',
    '29-2099.01': '/images/careers/healthcare-practitioners/neurodiagnostic-technologists.jpg',
    '29-2099.05': '/images/careers/healthcare-practitioners/ophthalmic-medical-technologists.jpg',
    '29-2099.08': '/images/careers/healthcare-practitioners/patient-representatives.jpg',
    '29-9021.00': '/images/careers/healthcare-practitioners/health-information-technologists-and-medical-registrars.jpg',
    '29-9091.00': '/images/careers/healthcare-practitioners/athletic-trainers.jpg',
    '29-9092.00': '/images/careers/healthcare-practitioners/genetic-counselors.jpg',
    '29-9093.00': '/images/careers/healthcare-practitioners/surgical-assistants.jpg',
    '29-9099.01': '/images/careers/healthcare-practitioners/midwives.jpg',
    // ── HEALTHCARE SUPPORT ──
    '31-1121.00': '/images/careers/healthcare-support/home-health-aides.jpg',
    '31-1122.00': '/images/careers/healthcare-support/personal-care-aides.jpg',
    '31-1131.00': '/images/careers/healthcare-support/nursing-assistants.jpg',
    '31-1132.00': '/images/careers/healthcare-support/orderlies.jpg',
    '31-1133.00': '/images/careers/healthcare-support/psychiatric-aides.jpg',
    '31-2011.00': '/images/careers/healthcare-support/occupational-therapy-assistants.jpg',
    '31-2012.00': '/images/careers/healthcare-support/occupational-therapy-aides.jpg',
    '31-2021.00': '/images/careers/healthcare-support/physical-therapist-assistants.jpg',
    '31-2022.00': '/images/careers/healthcare-support/physical-therapist-aides.jpg',
    '31-9011.00': '/images/careers/healthcare-support/massage-therapists.jpg',
    '31-9091.00': '/images/careers/healthcare-support/dental-assistants.jpg',
    '31-9092.00': '/images/careers/healthcare-support/medical-assistants.jpg',
    '31-9093.00': '/images/careers/healthcare-support/medical-equipment-preparers.jpg',
    '31-9094.00': '/images/careers/healthcare-support/medical-transcriptionists.jpg',
    '31-9095.00': '/images/careers/healthcare-support/pharmacy-aides.jpg',
    '31-9096.00': '/images/careers/healthcare-support/veterinary-assistants-and-laboratory-animal-caretakers.jpg',
    '31-9097.00': '/images/careers/healthcare-support/phlebotomists.jpg',
    '31-9099.01': '/images/careers/healthcare-support/speech-language-pathology-assistants.jpg',
    '31-9099.02': '/images/careers/healthcare-support/endoscopy-technicians.jpg',
    // ── INSTALLATION REPAIR ──
    '49-1011.00': '/images/careers/installation-repair/first-line-supervisors-of-mechanics-installers-and-repairers.jpg',
    '49-2011.00': '/images/careers/installation-repair/computer-automated-teller-and-office-machine-repairers.jpg',
    '49-2021.00': '/images/careers/installation-repair/radio-cellular-and-tower-equipment-installers-and-repairers.jpg',
    '49-2022.00': '/images/careers/installation-repair/telecommunications-equipment-installers-and-repairers-except.jpg',
    '49-2091.00': '/images/careers/installation-repair/avionics-technicians.jpg',
    '49-2092.00': '/images/careers/installation-repair/electric-motor-power-tool-and-related-repairers.jpg',
    '49-2093.00': '/images/careers/installation-repair/electrical-and-electronics-installers-and-repairers-transpor.jpg',
    '49-2094.00': '/images/careers/installation-repair/electrical-and-electronics-repairers-commercial-and-industri.jpg',
    '49-2095.00': '/images/careers/installation-repair/electrical-and-electronics-repairers-powerhouse-substation-a.jpg',
    '49-2096.00': '/images/careers/installation-repair/electronic-equipment-installers-and-repairers-motor-vehicles.jpg',
    '49-2097.00': '/images/careers/installation-repair/audiovisual-equipment-installers-and-repairers.jpg',
    '49-2098.00': '/images/careers/installation-repair/security-and-fire-alarm-systems-installers.jpg',
    '49-3011.00': '/images/careers/installation-repair/aircraft-mechanics-and-service-technicians.jpg',
    '49-3021.00': '/images/careers/installation-repair/automotive-body-and-related-repairers.jpg',
    '49-3022.00': '/images/careers/installation-repair/automotive-glass-installers-and-repairers.jpg',
    '49-3023.00': '/images/careers/installation-repair/automotive-service-technicians-and-mechanics.jpg',
    '49-3031.00': '/images/careers/installation-repair/bus-and-truck-mechanics-and-diesel-engine-specialists.jpg',
    '49-3041.00': '/images/careers/installation-repair/farm-equipment-mechanics-and-service-technicians.jpg',
    '49-3042.00': '/images/careers/installation-repair/mobile-heavy-equipment-mechanics-except-engines.jpg',
    '49-3043.00': '/images/careers/installation-repair/rail-car-repairers.jpg',
    '49-3051.00': '/images/careers/installation-repair/motorboat-mechanics-and-service-technicians.jpg',
    '49-3052.00': '/images/careers/installation-repair/motorcycle-mechanics.jpg',
    '49-3053.00': '/images/careers/installation-repair/outdoor-power-equipment-and-other-small-engine-mechanics.jpg',
    '49-3091.00': '/images/careers/installation-repair/bicycle-repairers.jpg',
    '49-3092.00': '/images/careers/installation-repair/recreational-vehicle-service-technicians.jpg',
    '49-3093.00': '/images/careers/installation-repair/tire-repairers-and-changers.jpg',
    '49-9011.00': '/images/careers/installation-repair/mechanical-door-repairers.jpg',
    '49-9012.00': '/images/careers/installation-repair/control-and-valve-installers-and-repairers-except-mechanical.jpg',
    '49-9021.00': '/images/careers/installation-repair/heating-air-conditioning-and-refrigeration-mechanics-and-ins.jpg',
    '49-9031.00': '/images/careers/installation-repair/home-appliance-repairers.jpg',
    '49-9041.00': '/images/careers/installation-repair/industrial-machinery-mechanics.jpg',
    '49-9043.00': '/images/careers/installation-repair/maintenance-workers-machinery.jpg',
    '49-9044.00': '/images/careers/installation-repair/millwrights.jpg',
    '49-9045.00': '/images/careers/installation-repair/refractory-materials-repairers-except-brickmasons.jpg',
    '49-9051.00': '/images/careers/installation-repair/electrical-power-line-installers-and-repairers.jpg',
    '49-9052.00': '/images/careers/installation-repair/telecommunications-line-installers-and-repairers.jpg',
    '49-9061.00': '/images/careers/installation-repair/camera-and-photographic-equipment-repairers.jpg',
    '49-9062.00': '/images/careers/installation-repair/medical-equipment-repairers.jpg',
    '49-9063.00': '/images/careers/installation-repair/musical-instrument-repairers-and-tuners.jpg',
    '49-9064.00': '/images/careers/installation-repair/watch-and-clock-repairers.jpg',
    '49-9071.00': '/images/careers/installation-repair/maintenance-and-repair-workers-general.jpg',
    '49-9081.00': '/images/careers/installation-repair/wind-turbine-service-technicians.jpg',
    '49-9091.00': '/images/careers/installation-repair/coin-vending-and-amusement-machine-servicers-and-repairers.jpg',
    '49-9092.00': '/images/careers/installation-repair/commercial-divers.jpg',
    '49-9094.00': '/images/careers/installation-repair/locksmiths-and-safe-repairers.jpg',
    '49-9095.00': '/images/careers/installation-repair/manufactured-building-and-mobile-home-installers.jpg',
    '49-9096.00': '/images/careers/installation-repair/riggers.jpg',
    '49-9097.00': '/images/careers/installation-repair/signal-and-track-switch-repairers.jpg',
    '49-9098.00': '/images/careers/installation-repair/helpers-installation-maintenance-and-repair-workers.jpg',
    '49-9099.00': '/images/careers/installation-repair/installation-maintenance-and-repair-workers-all-other.jpg',
    '49-9099.01': '/images/careers/installation-repair/geothermal-technicians.jpg',
    // ── LEGAL ──
    '23-1011.00': '/images/careers/legal/lawyers.jpg',
    '23-1012.00': '/images/careers/legal/judicial-law-clerks.jpg',
    '23-1021.00': '/images/careers/legal/administrative-law-judges-adjudicators-and-hearing-officers.jpg',
    '23-1022.00': '/images/careers/legal/arbitrators-mediators-and-conciliators.jpg',
    '23-1023.00': '/images/careers/legal/judges-magistrate-judges-and-magistrates.jpg',
    '23-2011.00': '/images/careers/legal/paralegals-and-legal-assistants.jpg',
    '23-2093.00': '/images/careers/legal/title-examiners-abstractors-and-searchers.jpg',
    '23-2099.00': '/images/careers/legal/legal-support-workers-all-other.jpg',
    // ── LIFE SCIENCE ──
    '19-1011.00': '/images/careers/life-science/animal-scientists.jpg',
    '19-1012.00': '/images/careers/life-science/food-scientists-and-technologists.jpg',
    '19-1013.00': '/images/careers/life-science/soil-and-plant-scientists.jpg',
    '19-1021.00': '/images/careers/life-science/biochemists-and-biophysicists.jpg',
    '19-1022.00': '/images/careers/life-science/microbiologists.jpg',
    '19-1023.00': '/images/careers/life-science/zoologists-and-wildlife-biologists.jpg',
    '19-1029.01': '/images/careers/life-science/bioinformatics-scientists.jpg',
    '19-1029.02': '/images/careers/life-science/molecular-and-cellular-biologists.jpg',
    '19-1029.03': '/images/careers/life-science/geneticists.jpg',
    '19-1029.04': '/images/careers/life-science/biologists.jpg',
    '19-1031.00': '/images/careers/life-science/conservation-scientists.jpg',
    '19-1031.02': '/images/careers/life-science/range-managers.jpg',
    '19-1031.03': '/images/careers/life-science/park-naturalists.jpg',
    '19-1032.00': '/images/careers/life-science/foresters.jpg',
    '19-1041.00': '/images/careers/life-science/epidemiologists.jpg',
    '19-1042.00': '/images/careers/life-science/medical-scientists-except-epidemiologists.jpg',
    '19-2011.00': '/images/careers/life-science/astronomers.jpg',
    '19-2012.00': '/images/careers/life-science/physicists.jpg',
    '19-2021.00': '/images/careers/life-science/atmospheric-and-space-scientists.jpg',
    '19-2031.00': '/images/careers/life-science/chemists.jpg',
    '19-2032.00': '/images/careers/life-science/materials-scientists.jpg',
    '19-2041.00': '/images/careers/life-science/environmental-scientists-and-specialists-including-health.jpg',
    '19-2041.01': '/images/careers/life-science/climate-change-policy-analysts.jpg',
    '19-2041.02': '/images/careers/life-science/environmental-restoration-planners.jpg',
    '19-2041.03': '/images/careers/life-science/industrial-ecologists.jpg',
    '19-2042.00': '/images/careers/life-science/geoscientists-except-hydrologists-and-geographers.jpg',
    '19-2043.00': '/images/careers/life-science/hydrologists.jpg',
    '19-2099.01': '/images/careers/life-science/remote-sensing-scientists-and-technologists.jpg',
    '19-3011.00': '/images/careers/life-science/economists.jpg',
    '19-3011.01': '/images/careers/life-science/environmental-economists.jpg',
    '19-3022.00': '/images/careers/life-science/survey-researchers.jpg',
    '19-3032.00': '/images/careers/life-science/industrial-organizational-psychologists.jpg',
    '19-3033.00': '/images/careers/life-science/clinical-and-counseling-psychologists.jpg',
    '19-3034.00': '/images/careers/life-science/school-psychologists.jpg',
    '19-3039.02': '/images/careers/life-science/neuropsychologists.jpg',
    '19-3039.03': '/images/careers/life-science/clinical-neuropsychologists.jpg',
    '19-3041.00': '/images/careers/life-science/sociologists.jpg',
    '19-3051.00': '/images/careers/life-science/urban-and-regional-planners.jpg',
    '19-3091.00': '/images/careers/life-science/anthropologists-and-archeologists.jpg',
    '19-3092.00': '/images/careers/life-science/geographers.jpg',
    '19-3093.00': '/images/careers/life-science/historians.jpg',
    '19-3094.00': '/images/careers/life-science/political-scientists.jpg',
    '19-3099.00': '/images/careers/life-science/social-scientists-and-related-workers-all-other.jpg',
    '19-3099.01': '/images/careers/life-science/transportation-planners.jpg',
    '19-4012.00': '/images/careers/life-science/agricultural-technicians.jpg',
    '19-4012.01': '/images/careers/life-science/precision-agriculture-technicians.jpg',
    '19-4013.00': '/images/careers/life-science/food-science-technicians.jpg',
    '19-4021.00': '/images/careers/life-science/biological-technicians.jpg',
    '19-4031.00': '/images/careers/life-science/chemical-technicians.jpg',
    '19-4042.00': '/images/careers/life-science/environmental-science-and-protection-technicians-including-h.jpg',
    '19-4043.00': '/images/careers/life-science/geological-technicians-except-hydrologic-technicians.jpg',
    '19-4044.00': '/images/careers/life-science/hydrologic-technicians.jpg',
    '19-4051.00': '/images/careers/life-science/nuclear-technicians.jpg',
    '19-4051.02': '/images/careers/life-science/nuclear-monitoring-technicians.jpg',
    '19-4061.00': '/images/careers/life-science/social-science-research-assistants.jpg',
    '19-4071.00': '/images/careers/life-science/forest-and-conservation-technicians.jpg',
    '19-4092.00': '/images/careers/life-science/forensic-science-technicians.jpg',
    '19-4099.01': '/images/careers/life-science/quality-control-analysts.jpg',
    '19-4099.03': '/images/careers/life-science/remote-sensing-technicians.jpg',
    '19-5011.00': '/images/careers/life-science/occupational-health-and-safety-specialists.jpg',
    '19-5012.00': '/images/careers/life-science/occupational-health-and-safety-technicians.jpg',
    // ── MANAGEMENT ──
    '11-1011.00': '/images/careers/management/chief-executives.jpg',
    '11-1011.03': '/images/careers/management/chief-sustainability-officers.jpg',
    '11-1021.00': '/images/careers/management/general-and-operations-managers.jpg',
    '11-1031.00': '/images/careers/management/legislators.jpg',
    '11-2011.00': '/images/careers/management/advertising-and-promotions-managers.jpg',
    '11-2021.00': '/images/careers/management/marketing-managers.jpg',
    '11-2022.00': '/images/careers/management/sales-managers.jpg',
    '11-2032.00': '/images/careers/management/public-relations-managers.jpg',
    '11-2033.00': '/images/careers/management/fundraising-managers.jpg',
    '11-3012.00': '/images/careers/management/administrative-services-managers.jpg',
    '11-3013.00': '/images/careers/management/facilities-managers.jpg',
    '11-3013.01': '/images/careers/management/security-managers.jpg',
    '11-3021.00': '/images/careers/management/computer-and-information-systems-managers.jpg',
    '11-3031.00': '/images/careers/management/financial-managers.jpg',
    '11-3031.01': '/images/careers/management/treasurers-and-controllers.jpg',
    '11-3031.03': '/images/careers/management/investment-fund-managers.jpg',
    '11-3051.00': '/images/careers/management/industrial-production-managers.jpg',
    '11-3051.01': '/images/careers/management/quality-control-systems-managers.jpg',
    '11-3051.02': '/images/careers/management/geothermal-production-managers.jpg',
    '11-3051.03': '/images/careers/management/biofuels-production-managers.jpg',
    '11-3051.04': '/images/careers/management/biomass-power-plant-managers.jpg',
    '11-3051.06': '/images/careers/management/hydroelectric-production-managers.jpg',
    '11-3061.00': '/images/careers/management/purchasing-managers.jpg',
    '11-3071.00': '/images/careers/management/transportation-storage-and-distribution-managers.jpg',
    '11-3071.04': '/images/careers/management/supply-chain-managers.jpg',
    '11-3111.00': '/images/careers/management/compensation-and-benefits-managers.jpg',
    '11-3121.00': '/images/careers/management/human-resources-managers.jpg',
    '11-3131.00': '/images/careers/management/training-and-development-managers.jpg',
    '11-9013.00': '/images/careers/management/farmers-ranchers-and-other-agricultural-managers.jpg',
    '11-9021.00': '/images/careers/management/construction-managers.jpg',
    '11-9031.00': '/images/careers/management/education-and-childcare-administrators-preschool-and-daycare.jpg',
    '11-9032.00': '/images/careers/management/education-administrators-kindergarten-through-secondary.jpg',
    '11-9033.00': '/images/careers/management/education-administrators-postsecondary.jpg',
    '11-9039.00': '/images/careers/management/education-administrators-all-other.jpg',
    '11-9041.00': '/images/careers/management/architectural-and-engineering-managers.jpg',
    '11-9041.01': '/images/careers/management/biofuelsbiodiesel-technology-and-product-development-manager.jpg',
    '11-9051.00': '/images/careers/management/food-service-managers.jpg',
    '11-9071.00': '/images/careers/management/gambling-managers.jpg',
    '11-9072.00': '/images/careers/management/entertainment-and-recreation-managers-except-gambling.jpg',
    '11-9081.00': '/images/careers/management/lodging-managers.jpg',
    '11-9111.00': '/images/careers/management/medical-and-health-services-managers.jpg',
    '11-9121.00': '/images/careers/management/natural-sciences-managers.jpg',
    '11-9121.01': '/images/careers/management/clinical-research-coordinators.jpg',
    '11-9121.02': '/images/careers/management/water-resource-specialists.jpg',
    '11-9131.00': '/images/careers/management/postmasters-and-mail-superintendents.jpg',
    '11-9141.00': '/images/careers/management/property-real-estate-and-community-association-managers.jpg',
    '11-9151.00': '/images/careers/management/social-and-community-service-managers.jpg',
    '11-9161.00': '/images/careers/management/emergency-management-directors.jpg',
    '11-9171.00': '/images/careers/management/funeral-home-managers.jpg',
    '11-9179.01': '/images/careers/management/fitness-and-wellness-coordinators.jpg',
    '11-9179.02': '/images/careers/management/spa-managers.jpg',
    '11-9199.00': '/images/careers/management/managers-all-other.jpg',
    '11-9199.01': '/images/careers/management/regulatory-affairs-managers.jpg',
    '11-9199.02': '/images/careers/management/compliance-managers.jpg',
    '11-9199.08': '/images/careers/management/loss-prevention-managers.jpg',
    '11-9199.09': '/images/careers/management/wind-energy-operations-managers.jpg',
    '11-9199.10': '/images/careers/management/wind-energy-development-managers.jpg',
    '11-9199.11': '/images/careers/management/brownfield-redevelopment-specialists-and-site-managers.jpg',
    // ── OFFICE ADMIN ──
    '43-1011.00': '/images/careers/office-admin/first-line-supervisors-of-office-and-administrative-support-.jpg',
    '43-2011.00': '/images/careers/office-admin/switchboard-operators-including-answering-service.jpg',
    '43-2021.00': '/images/careers/office-admin/telephone-operators.jpg',
    '43-3011.00': '/images/careers/office-admin/bill-and-account-collectors.jpg',
    '43-3021.00': '/images/careers/office-admin/billing-and-posting-clerks.jpg',
    '43-3031.00': '/images/careers/office-admin/bookkeeping-accounting-and-auditing-clerks.jpg',
    '43-3041.00': '/images/careers/office-admin/gambling-cage-workers.jpg',
    '43-3051.00': '/images/careers/office-admin/payroll-and-timekeeping-clerks.jpg',
    '43-3061.00': '/images/careers/office-admin/procurement-clerks.jpg',
    '43-3071.00': '/images/careers/office-admin/tellers.jpg',
    '43-4011.00': '/images/careers/office-admin/brokerage-clerks.jpg',
    '43-4021.00': '/images/careers/office-admin/correspondence-clerks.jpg',
    '43-4031.00': '/images/careers/office-admin/court-municipal-and-license-clerks.jpg',
    '43-4041.00': '/images/careers/office-admin/credit-authorizers-checkers-and-clerks.jpg',
    '43-4051.00': '/images/careers/office-admin/customer-service-representatives.jpg',
    '43-4061.00': '/images/careers/office-admin/eligibility-interviewers-government-programs.jpg',
    '43-4071.00': '/images/careers/office-admin/file-clerks.jpg',
    '43-4081.00': '/images/careers/office-admin/hotel-motel-and-resort-desk-clerks.jpg',
    '43-4111.00': '/images/careers/office-admin/interviewers-except-eligibility-and-loan.jpg',
    '43-4121.00': '/images/careers/office-admin/library-assistants-clerical.jpg',
    '43-4131.00': '/images/careers/office-admin/loan-interviewers-and-clerks.jpg',
    '43-4141.00': '/images/careers/office-admin/new-accounts-clerks.jpg',
    '43-4151.00': '/images/careers/office-admin/order-clerks.jpg',
    '43-4161.00': '/images/careers/office-admin/human-resources-assistants-except-payroll-and-timekeeping.jpg',
    '43-4171.00': '/images/careers/office-admin/receptionists-and-information-clerks.jpg',
    '43-4181.00': '/images/careers/office-admin/reservation-and-transportation-ticket-agents-and-travel-cler.jpg',
    '43-4199.00': '/images/careers/office-admin/information-and-record-clerks-all-other.jpg',
    '43-5011.00': '/images/careers/office-admin/cargo-and-freight-agents.jpg',
    '43-5011.01': '/images/careers/office-admin/freight-forwarders.jpg',
    '43-5021.00': '/images/careers/office-admin/couriers-and-messengers.jpg',
    '43-5031.00': '/images/careers/office-admin/public-safety-telecommunicators.jpg',
    '43-5032.00': '/images/careers/office-admin/dispatchers-except-police-fire-and-ambulance.jpg',
    '43-5041.00': '/images/careers/office-admin/meter-readers-utilities.jpg',
    '43-5051.00': '/images/careers/office-admin/postal-service-clerks.jpg',
    '43-5052.00': '/images/careers/office-admin/postal-service-mail-carriers.jpg',
    '43-5053.00': '/images/careers/office-admin/postal-service-mail-sorters-processors-and-processing-machin.jpg',
    '43-5061.00': '/images/careers/office-admin/production-planning-and-expediting-clerks.jpg',
    '43-5071.00': '/images/careers/office-admin/shipping-receiving-and-inventory-clerks.jpg',
    '43-5111.00': '/images/careers/office-admin/weighers-measurers-checkers-and-samplers-recordkeeping.jpg',
    '43-6011.00': '/images/careers/office-admin/executive-secretaries-and-executive-administrative-assistant.jpg',
    '43-6012.00': '/images/careers/office-admin/legal-secretaries-and-administrative-assistants.jpg',
    '43-6013.00': '/images/careers/office-admin/medical-secretaries-and-administrative-assistants.jpg',
    '43-6014.00': '/images/careers/office-admin/secretaries-and-administrative-assistants-except-legal-medic.jpg',
    '43-9021.00': '/images/careers/office-admin/data-entry-keyers.jpg',
    '43-9022.00': '/images/careers/office-admin/word-processors-and-typists.jpg',
    '43-9031.00': '/images/careers/office-admin/desktop-publishers.jpg',
    '43-9041.00': '/images/careers/office-admin/insurance-claims-and-policy-processing-clerks.jpg',
    '43-9051.00': '/images/careers/office-admin/mail-clerks-and-mail-machine-operators-except-postal-service.jpg',
    '43-9061.00': '/images/careers/office-admin/office-clerks-general.jpg',
    '43-9071.00': '/images/careers/office-admin/office-machine-operators-except-computer.jpg',
    '43-9081.00': '/images/careers/office-admin/proofreaders-and-copy-markers.jpg',
    '43-9111.00': '/images/careers/office-admin/statistical-assistants.jpg',
    '43-9199.00': '/images/careers/office-admin/office-and-administrative-support-workers-all-other.jpg',
    // ── PERSONAL CARE ──
    '39-1013.00': '/images/careers/personal-care/casino-supervisor.jpg',
    '39-1014.00': '/images/careers/personal-care/entertainment-supervisor.jpg',
    '39-1022.00': '/images/careers/personal-care/personal-service-supervisor.jpg',
    '39-2011.00': '/images/careers/personal-care/animal-trainer.jpg',
    '39-2021.00': '/images/careers/personal-care/animal-caretaker.jpg',
    '39-3011.00': '/images/careers/personal-care/gambling-dealer.jpg',
    '39-3012.00': '/images/careers/personal-care/sports-book-writer.jpg',
    '39-3021.00': '/images/careers/personal-care/movie-projectionist.jpg',
    '39-3031.00': '/images/careers/personal-care/usher-ticket-taker.jpg',
    '39-3091.00': '/images/careers/personal-care/amusement-attendant.jpg',
    '39-3092.00': '/images/careers/personal-care/costume-attendant.jpg',
    '39-3093.00': '/images/careers/personal-care/locker-room-attendant.jpg',
    '39-4011.00': '/images/careers/personal-care/embalmer.jpg',
    '39-4012.00': '/images/careers/personal-care/crematory-operator.jpg',
    '39-4021.00': '/images/careers/personal-care/funeral-attendant.jpg',
    '39-4031.00': '/images/careers/personal-care/mortician.jpg',
    '39-5011.00': '/images/careers/personal-care/barber.jpg',
    '39-5012.00': '/images/careers/personal-care/hairdresser.jpg',
    '39-5091.00': '/images/careers/personal-care/makeup-artist.jpg',
    '39-5092.00': '/images/careers/personal-care/manicurist.jpg',
    '39-5093.00': '/images/careers/personal-care/shampooer.jpg',
    '39-5094.00': '/images/careers/personal-care/skincare-specialist.jpg',
    '39-6011.00': '/images/careers/personal-care/baggage-porter.jpg',
    '39-6012.00': '/images/careers/personal-care/concierge.jpg',
    '39-7011.00': '/images/careers/personal-care/tour-guide.jpg',
    '39-7012.00': '/images/careers/personal-care/travel-guide.jpg',
    '39-9011.00': '/images/careers/personal-care/childcare-worker.jpg',
    '39-9011.01': '/images/careers/personal-care/nanny.jpg',
    '39-9031.00': '/images/careers/personal-care/fitness-trainer.jpg',
    '39-9032.00': '/images/careers/personal-care/recreation-worker.jpg',
    '39-9041.00': '/images/careers/personal-care/residential-advisor.jpg',
    // ── PRODUCTION ──
    '51-1011.00': '/images/careers/production/first-line-supervisors-of-production-and-operating-workers.jpg',
    '51-2011.00': '/images/careers/production/aircraft-structure-surfaces-rigging-and-systems-assemblers.jpg',
    '51-2021.00': '/images/careers/production/coil-winders-tapers-and-finishers.jpg',
    '51-2022.00': '/images/careers/production/electrical-and-electronic-equipment-assemblers.jpg',
    '51-2023.00': '/images/careers/production/electromechanical-equipment-assemblers.jpg',
    '51-2031.00': '/images/careers/production/engine-and-other-machine-assemblers.jpg',
    '51-2041.00': '/images/careers/production/structural-metal-fabricators-and-fitters.jpg',
    '51-2051.00': '/images/careers/production/fiberglass-laminators-and-fabricators.jpg',
    '51-2061.00': '/images/careers/production/timing-device-assemblers-and-adjusters.jpg',
    '51-2092.00': '/images/careers/production/team-assemblers.jpg',
    '51-2099.00': '/images/careers/production/assemblers-and-fabricators-all-other.jpg',
    '51-3011.00': '/images/careers/production/bakers.jpg',
    '51-3021.00': '/images/careers/production/butchers-and-meat-cutters.jpg',
    '51-3022.00': '/images/careers/production/meat-poultry-and-fish-cutters-and-trimmers.jpg',
    '51-3023.00': '/images/careers/production/slaughterers-and-meat-packers.jpg',
    '51-3091.00': '/images/careers/production/food-and-tobacco-roasting-baking-and-drying-machine-operator.jpg',
    '51-3092.00': '/images/careers/production/food-batchmakers.jpg',
    '51-3093.00': '/images/careers/production/food-cooking-machine-operators-and-tenders.jpg',
    '51-3099.00': '/images/careers/production/food-processing-workers-all-other.jpg',
    '51-4021.00': '/images/careers/production/extruding-and-drawing-machine-setters-operators-and-tenders-.jpg',
    '51-4022.00': '/images/careers/production/forging-machine-setters-operators-and-tenders-metal-and-plas.jpg',
    '51-4023.00': '/images/careers/production/rolling-machine-setters-operators-and-tenders-metal-and-plas.jpg',
    '51-4031.00': '/images/careers/production/cutting-punching-and-press-machine-setters-operators-and-ten.jpg',
    '51-4032.00': '/images/careers/production/drilling-and-boring-machine-tool-setters-operators-and-tende.jpg',
    '51-4033.00': '/images/careers/production/grinding-lapping-polishing-and-buffing-machine-tool-setters-.jpg',
    '51-4034.00': '/images/careers/production/lathe-and-turning-machine-tool-setters-operators-and-tenders.jpg',
    '51-4035.00': '/images/careers/production/milling-and-planing-machine-setters-operators-and-tenders-me.jpg',
    '51-4041.00': '/images/careers/production/machinists.jpg',
    '51-4051.00': '/images/careers/production/metal-refining-furnace-operators-and-tenders.jpg',
    '51-4052.00': '/images/careers/production/pourers-and-casters-metal.jpg',
    '51-4061.00': '/images/careers/production/model-makers-metal-and-plastic.jpg',
    '51-4062.00': '/images/careers/production/patternmakers-metal-and-plastic.jpg',
    '51-4071.00': '/images/careers/production/foundry-mold-and-coremakers.jpg',
    '51-4072.00': '/images/careers/production/molding-coremaking-and-casting-machine-setters-operators-and.jpg',
    '51-4081.00': '/images/careers/production/multiple-machine-tool-setters-operators-and-tenders-metal-an.jpg',
    '51-4111.00': '/images/careers/production/tool-and-die-makers.jpg',
    '51-4121.00': '/images/careers/production/welders-cutters-solderers-and-brazers.jpg',
    '51-4122.00': '/images/careers/production/welding-soldering-and-brazing-machine-setters-operators-and-.jpg',
    '51-4191.00': '/images/careers/production/heat-treating-equipment-setters-operators-and-tenders-metal-.jpg',
    '51-4192.00': '/images/careers/production/layout-workers-metal-and-plastic.jpg',
    '51-4193.00': '/images/careers/production/plating-machine-setters-operators-and-tenders-metal-and-plas.jpg',
    '51-4194.00': '/images/careers/production/tool-grinders-filers-and-sharpeners.jpg',
    '51-4199.00': '/images/careers/production/metal-workers-and-plastic-workers-all-other.jpg',
    '51-5111.00': '/images/careers/production/prepress-technicians-and-workers.jpg',
    '51-5112.00': '/images/careers/production/printing-press-operators.jpg',
    '51-5113.00': '/images/careers/production/print-binding-and-finishing-workers.jpg',
    '51-6011.00': '/images/careers/production/laundry-and-dry-cleaning-workers.jpg',
    '51-6021.00': '/images/careers/production/pressers-textile-garment-and-related-materials.jpg',
    '51-6031.00': '/images/careers/production/sewing-machine-operators.jpg',
    '51-6041.00': '/images/careers/production/shoe-and-leather-workers-and-repairers.jpg',
    '51-6042.00': '/images/careers/production/shoe-machine-operators-and-tenders.jpg',
    '51-6051.00': '/images/careers/production/sewers-hand.jpg',
    '51-6052.00': '/images/careers/production/tailors-dressmakers-and-custom-sewers.jpg',
    '51-6061.00': '/images/careers/production/textile-bleaching-and-dyeing-machine-operators-and-tenders.jpg',
    '51-6062.00': '/images/careers/production/textile-cutting-machine-setters-operators-and-tenders.jpg',
    '51-6063.00': '/images/careers/production/textile-knitting-and-weaving-machine-setters-operators-and-t.jpg',
    '51-6064.00': '/images/careers/production/textile-winding-twisting-and-drawing-out-machine-setters-ope.jpg',
    '51-6091.00': '/images/careers/production/extruding-and-forming-machine-setters-operators-and-tenders-.jpg',
    '51-6092.00': '/images/careers/production/fabric-and-apparel-patternmakers.jpg',
    '51-6093.00': '/images/careers/production/upholsterers.jpg',
    '51-6099.00': '/images/careers/production/textile-apparel-and-furnishings-workers-all-other.jpg',
    '51-7011.00': '/images/careers/production/cabinetmakers-and-bench-carpenters.jpg',
    '51-7021.00': '/images/careers/production/furniture-finishers.jpg',
    '51-7031.00': '/images/careers/production/model-makers-wood.jpg',
    '51-7032.00': '/images/careers/production/patternmakers-wood.jpg',
    '51-7041.00': '/images/careers/production/sawing-machine-setters-operators-and-tenders-wood.jpg',
    '51-7042.00': '/images/careers/production/woodworking-machine-setters-operators-and-tenders-except-saw.jpg',
    '51-7099.00': '/images/careers/production/woodworkers-all-other.jpg',
    '51-8011.00': '/images/careers/production/nuclear-power-reactor-operators.jpg',
    '51-8012.00': '/images/careers/production/power-distributors-and-dispatchers.jpg',
    '51-8013.00': '/images/careers/production/power-plant-operators.jpg',
    '51-8013.03': '/images/careers/production/biomass-plant-technicians.jpg',
    '51-8013.04': '/images/careers/production/hydroelectric-plant-technicians.jpg',
    '51-8021.00': '/images/careers/production/stationary-engineers-and-boiler-operators.jpg',
    '51-8031.00': '/images/careers/production/water-and-wastewater-treatment-plant-and-system-operators.jpg',
    '51-8091.00': '/images/careers/production/chemical-plant-and-system-operators.jpg',
    '51-8092.00': '/images/careers/production/gas-plant-operators.jpg',
    '51-8093.00': '/images/careers/production/petroleum-pump-system-operators-refinery-operators-and-gauge.jpg',
    '51-8099.00': '/images/careers/production/plant-and-system-operators-all-other.jpg',
    '51-8099.01': '/images/careers/production/biofuels-processing-technicians.jpg',
    '51-9011.00': '/images/careers/production/chemical-equipment-operators-and-tenders.jpg',
    '51-9012.00': '/images/careers/production/separating-filtering-clarifying-precipitating-and-still-mach.jpg',
    '51-9021.00': '/images/careers/production/crushing-grinding-and-polishing-machine-setters-operators-an.jpg',
    '51-9022.00': '/images/careers/production/grinding-and-polishing-workers-hand.jpg',
    '51-9023.00': '/images/careers/production/mixing-and-blending-machine-setters-operators-and-tenders.jpg',
    '51-9031.00': '/images/careers/production/cutters-and-trimmers-hand.jpg',
    '51-9032.00': '/images/careers/production/cutting-and-slicing-machine-setters-operators-and-tenders.jpg',
    '51-9041.00': '/images/careers/production/extruding-forming-pressing-and-compacting-machine-setters-op.jpg',
    '51-9051.00': '/images/careers/production/furnace-kiln-oven-drier-and-kettle-operators-and-tenders.jpg',
    '51-9061.00': '/images/careers/production/inspectors-testers-sorters-samplers-and-weighers.jpg',
    '51-9071.00': '/images/careers/production/jewelers-and-precious-stone-and-metal-workers.jpg',
    '51-9071.06': '/images/careers/production/gem-and-diamond-workers.jpg',
    '51-9081.00': '/images/careers/production/dental-laboratory-technicians.jpg',
    '51-9082.00': '/images/careers/production/medical-appliance-technicians.jpg',
    '51-9083.00': '/images/careers/production/ophthalmic-laboratory-technicians.jpg',
    '51-9111.00': '/images/careers/production/packaging-and-filling-machine-operators-and-tenders.jpg',
    '51-9123.00': '/images/careers/production/painting-coating-and-decorating-workers.jpg',
    '51-9124.00': '/images/careers/production/coating-painting-and-spraying-machine-setters-operators-and-.jpg',
    '51-9141.00': '/images/careers/production/semiconductor-processing-technicians.jpg',
    '51-9151.00': '/images/careers/production/photographic-process-workers-and-processing-machine-operator.jpg',
    '51-9161.00': '/images/careers/production/computer-numerically-controlled-tool-operators.jpg',
    '51-9162.00': '/images/careers/production/computer-numerically-controlled-tool-programmers.jpg',
    '51-9191.00': '/images/careers/production/adhesive-bonding-machine-operators-and-tenders.jpg',
    '51-9192.00': '/images/careers/production/cleaning-washing-and-metal-pickling-equipment-operators-and-.jpg',
    '51-9193.00': '/images/careers/production/cooling-and-freezing-equipment-operators-and-tenders.jpg',
    '51-9194.00': '/images/careers/production/etchers-and-engravers.jpg',
    '51-9195.00': '/images/careers/production/molders-shapers-and-casters-except-metal-and-plastic.jpg',
    '51-9195.03': '/images/careers/production/stone-cutters-and-carvers-manufacturing.jpg',
    '51-9195.04': '/images/careers/production/glass-blowers-molders-benders-and-finishers.jpg',
    '51-9195.05': '/images/careers/production/potters-manufacturing.jpg',
    '51-9196.00': '/images/careers/production/paper-goods-machine-setters-operators-and-tenders.jpg',
    '51-9197.00': '/images/careers/production/tire-builders.jpg',
    '51-9198.00': '/images/careers/production/helpers-production-workers.jpg',
    '51-9199.00': '/images/careers/production/production-workers-all-other.jpg',
    // ── PROTECTIVE SERVICE ──
    '33-1011.00': '/images/careers/protective-service/first-line-supervisors-of-correctional-officers.jpg',
    '33-1012.00': '/images/careers/protective-service/first-line-supervisors-of-police-and-detectives.jpg',
    '33-1021.00': '/images/careers/protective-service/first-line-supervisors-of-firefighting-and-prevention-worker.jpg',
    '33-1091.00': '/images/careers/protective-service/first-line-supervisors-of-security-workers.jpg',
    '33-1099.00': '/images/careers/protective-service/first-line-supervisors-of-protective-service-workers-all-oth.jpg',
    '33-2011.00': '/images/careers/protective-service/firefighters.jpg',
    '33-2021.00': '/images/careers/protective-service/fire-inspectors-and-investigators.jpg',
    '33-2022.00': '/images/careers/protective-service/forest-fire-inspectors-and-prevention-specialists.jpg',
    '33-3011.00': '/images/careers/protective-service/bailiffs.jpg',
    '33-3012.00': '/images/careers/protective-service/correctional-officers-and-jailers.jpg',
    '33-3021.00': '/images/careers/protective-service/detectives-and-criminal-investigators.jpg',
    '33-3021.02': '/images/careers/protective-service/police-identification-and-records-officers.jpg',
    '33-3021.06': '/images/careers/protective-service/intelligence-analysts.jpg',
    '33-3031.00': '/images/careers/protective-service/fish-and-game-wardens.jpg',
    '33-3041.00': '/images/careers/protective-service/parking-enforcement-workers.jpg',
    '33-3051.00': '/images/careers/protective-service/police-and-sheriffs-patrol-officers.jpg',
    '33-3051.04': '/images/careers/protective-service/customs-and-border-protection-officers.jpg',
    '33-3052.00': '/images/careers/protective-service/transit-and-railroad-police.jpg',
    '33-9011.00': '/images/careers/protective-service/animal-control-workers.jpg',
    '33-9021.00': '/images/careers/protective-service/private-detectives-and-investigators.jpg',
    '33-9031.00': '/images/careers/protective-service/gambling-surveillance-officers-and-gambling-investigators.jpg',
    '33-9032.00': '/images/careers/protective-service/security-guards.jpg',
    '33-9091.00': '/images/careers/protective-service/crossing-guards-and-flaggers.jpg',
    '33-9092.00': '/images/careers/protective-service/lifeguards-ski-patrol-and-other-recreational-protective-serv.jpg',
    '33-9093.00': '/images/careers/protective-service/transportation-security-screeners.jpg',
    '33-9094.00': '/images/careers/protective-service/school-bus-monitors.jpg',
    '33-9099.02': '/images/careers/protective-service/retail-loss-prevention-specialists.jpg',
    // ── SALES ──
    '41-1011.00': '/images/careers/sales/first-line-supervisors-of-retail-sales-workers.jpg',
    '41-1012.00': '/images/careers/sales/first-line-supervisors-of-non-retail-sales-workers.jpg',
    '41-2011.00': '/images/careers/sales/cashiers.jpg',
    '41-2012.00': '/images/careers/sales/gambling-change-persons-and-booth-cashiers.jpg',
    '41-2021.00': '/images/careers/sales/counter-and-rental-clerks.jpg',
    '41-2022.00': '/images/careers/sales/parts-salespersons.jpg',
    '41-2031.00': '/images/careers/sales/retail-salespersons.jpg',
    '41-3011.00': '/images/careers/sales/advertising-sales-agents.jpg',
    '41-3021.00': '/images/careers/sales/insurance-sales-agents.jpg',
    '41-3031.00': '/images/careers/sales/securities-commodities-and-financial-services-sales-agents.jpg',
    '41-3041.00': '/images/careers/sales/travel-agents.jpg',
    '41-3091.00': '/images/careers/sales/sales-representatives-of-services-except-advertising-insuran.jpg',
    '41-4011.00': '/images/careers/sales/sales-representatives-wholesale-and-manufacturing-technical-.jpg',
    '41-4011.07': '/images/careers/sales/solar-sales-representatives-and-assessors.jpg',
    '41-4012.00': '/images/careers/sales/sales-representatives-wholesale-and-manufacturing-except-tec.jpg',
    '41-9011.00': '/images/careers/sales/demonstrators-and-product-promoters.jpg',
    '41-9012.00': '/images/careers/sales/models.jpg',
    '41-9021.00': '/images/careers/sales/real-estate-brokers.jpg',
    '41-9022.00': '/images/careers/sales/real-estate-sales-agents.jpg',
    '41-9031.00': '/images/careers/sales/sales-engineers.jpg',
    '41-9041.00': '/images/careers/sales/retail-salespersons.jpg',
    '41-9091.00': '/images/careers/sales/door-to-door-sales-workers-news-and-street-vendors-and-relat.jpg',
    '41-9099.00': '/images/careers/sales/sales-and-related-workers-all-other.jpg',
    // ── TRANSPORTATION ──
    '53-1041.00': '/images/careers/transportation/aircraft-cargo-handling-supervisors.jpg',
    '53-1042.00': '/images/careers/transportation/first-line-supervisors-of-helpers-laborers-and-material-move.jpg',
    '53-1042.01': '/images/careers/transportation/recycling-coordinators.jpg',
    '53-1043.00': '/images/careers/transportation/first-line-supervisors-of-material-moving-machine-and-vehicl.jpg',
    '53-1044.00': '/images/careers/transportation/first-line-supervisors-of-passenger-attendants.jpg',
    '53-2011.00': '/images/careers/transportation/airline-pilots-copilots-and-flight-engineers.jpg',
    '53-2012.00': '/images/careers/transportation/commercial-pilots.jpg',
    '53-2021.00': '/images/careers/transportation/air-traffic-controllers.jpg',
    '53-2022.00': '/images/careers/transportation/airfield-operations-specialists.jpg',
    '53-2031.00': '/images/careers/transportation/flight-attendants.jpg',
    '53-3011.00': '/images/careers/transportation/ambulance-drivers-and-attendants-except-emergency-medical-te.jpg',
    '53-3031.00': '/images/careers/transportation/driversales-workers.jpg',
    '53-3032.00': '/images/careers/transportation/heavy-and-tractor-trailer-truck-drivers.jpg',
    '53-3033.00': '/images/careers/transportation/light-truck-drivers.jpg',
    '53-3051.00': '/images/careers/transportation/bus-drivers-school.jpg',
    '53-3052.00': '/images/careers/transportation/bus-drivers-transit-and-intercity.jpg',
    '53-3053.00': '/images/careers/transportation/shuttle-drivers-and-chauffeurs.jpg',
    '53-3054.00': '/images/careers/transportation/taxi-drivers.jpg',
    '53-4011.00': '/images/careers/transportation/locomotive-engineers.jpg',
    '53-4013.00': '/images/careers/transportation/rail-yard-engineers-dinkey-operators-and-hostlers.jpg',
    '53-4022.00': '/images/careers/transportation/railroad-brake-signal-and-switch-operators-and-locomotive-fi.jpg',
    '53-4031.00': '/images/careers/transportation/railroad-conductors-and-yardmasters.jpg',
    '53-4041.00': '/images/careers/transportation/subway-and-streetcar-operators.jpg',
    '53-5011.00': '/images/careers/transportation/sailors-and-marine-oilers.jpg',
    '53-5021.00': '/images/careers/transportation/captains-mates-and-pilots-of-water-vessels.jpg',
    '53-5022.00': '/images/careers/transportation/motorboat-operators.jpg',
    '53-5031.00': '/images/careers/transportation/ship-engineers.jpg',
    '53-6011.00': '/images/careers/transportation/bridge-and-lock-tenders.jpg',
    '53-6021.00': '/images/careers/transportation/parking-attendants.jpg',
    '53-6031.00': '/images/careers/transportation/automotive-and-watercraft-service-attendants.jpg',
    '53-6032.00': '/images/careers/transportation/aircraft-service-attendants.jpg',
    '53-6041.00': '/images/careers/transportation/traffic-technicians.jpg',
    '53-6051.00': '/images/careers/transportation/transportation-inspectors.jpg',
    '53-6051.01': '/images/careers/transportation/aviation-inspectors.jpg',
    '53-6051.07': '/images/careers/transportation/transportation-vehicle-equipment-and-systems-inspectors-exce.jpg',
    '53-6061.00': '/images/careers/transportation/passenger-attendants.jpg',
    '53-6099.00': '/images/careers/transportation/transportation-workers-all-other.jpg',
    '53-7011.00': '/images/careers/transportation/conveyor-operators-and-tenders.jpg',
    '53-7021.00': '/images/careers/transportation/crane-and-tower-operators.jpg',
    '53-7031.00': '/images/careers/transportation/dredge-operators.jpg',
    '53-7041.00': '/images/careers/transportation/hoist-and-winch-operators.jpg',
    '53-7051.00': '/images/careers/transportation/industrial-truck-and-tractor-operators.jpg',
    '53-7061.00': '/images/careers/transportation/cleaners-of-vehicles-and-equipment.jpg',
    '53-7062.00': '/images/careers/transportation/laborers-and-freight-stock-and-material-movers-hand.jpg',
    '53-7062.04': '/images/careers/transportation/recycling-and-reclamation-workers.jpg',
    '53-7063.00': '/images/careers/transportation/machine-feeders-and-offbearers.jpg',
    '53-7064.00': '/images/careers/transportation/packers-and-packagers-hand.jpg',
    '53-7065.00': '/images/careers/transportation/stockers-and-order-fillers.jpg',
    '53-7071.00': '/images/careers/transportation/gas-compressor-and-gas-pumping-station-operators.jpg',
    '53-7072.00': '/images/careers/transportation/pump-operators-except-wellhead-pumpers.jpg',
    '53-7073.00': '/images/careers/transportation/wellhead-pumpers.jpg',
    '53-7081.00': '/images/careers/transportation/refuse-and-recyclable-material-collectors.jpg',
    '53-7121.00': '/images/careers/transportation/tank-car-truck-and-ship-loaders.jpg',
};


const GROUP_FALLBACK_IMAGES: Record<string, string> = {
    'sales': '/images/careers/sales/retail-salespersons.jpg',
    'computer-math': '/images/careers/computer-math/software-developer.jpg',
    'healthcare-practitioners': '/images/careers/healthcare-practitioners/family-medicine-physicians.jpg',
    'healthcare-support': '/images/careers/healthcare-support/nursing-assistants.jpg',
    'education':                'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=400&h=240&fit=crop&auto=format',
    'business-finance':         'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&h=240&fit=crop&auto=format',
    'architecture-engineering': '/images/careers/architecture-engineering/civil-engineers.jpg',
    'arts-media': '/images/careers/arts-media/graphic-designers.jpg',
    'legal': '/images/careers/legal/lawyers.jpg',
    'management': '/images/careers/management/general-and-operations-managers.jpg',
    'transportation': '/images/careers/transportation/heavy-and-tractor-trailer-truck-drivers.jpg',
    'construction': '/images/careers/construction/construction-laborers.jpg',
    'food-service': '/images/careers/food-service/chefs-and-head-cooks.jpg',
    'community-social':         'https://images.unsplash.com/photo-1559027615-cd4628902d4a?w=400&h=240&fit=crop&auto=format',
    'protective-service': '/images/careers/protective-service/police-and-sheriffs-patrol-officers.jpg',
    'personal-care': '/images/careers/personal-care/hairdresser.jpg',
    'office-admin':             'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&h=240&fit=crop&auto=format',
    'life-science':             'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=400&h=240&fit=crop&auto=format',
    'farming-forestry':         'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=400&h=240&fit=crop&auto=format',
    'installation-repair':      'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=400&h=240&fit=crop&auto=format',
    'production': '/images/careers/production/first-line-supervisors-of-production-and-operating-workers.jpg',
    'building-maintenance': '/images/careers/building-maintenance/janitor.jpg',
};

/**
 * Lấy URL hình ảnh cho một nghề nghiệp.
 * Ưu tiên: ảnh theo onet_code → ảnh theo group slug → ảnh mặc định
 */
function getCareerImageUrl(onetCode: string | undefined, groupSlug: string): string {
    if (onetCode && CAREER_IMAGES[onetCode]) {
        return CAREER_IMAGES[onetCode];
    }
    return GROUP_FALLBACK_IMAGES[groupSlug]
        || 'https://images.unsplash.com/photo-1521791136064-7986c2920216?w=400&h=240&fit=crop&auto=format';
}

const CareersByGroupPage = () => {
    const { groupSlug, param } = useParams<{ groupSlug?: string; param?: string }>();
    const actualGroupSlug = groupSlug || param;
    const navigate = useNavigate();

    const [data, setData] = useState<CareersByGroupResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [pageSize] = useState(9);
    const [q, setQ] = useState('');

    const { hasFeature, currentPlan, getPlanInfo } = useFeatureAccess();
    const { canUseFeature } = useUsageTracking();
    const { trackCall } = useApiCallTracker('CareersByGroupPage');

    const fetchCareers = useCallback(async () => {
        if (!actualGroupSlug) return;

        console.log(`🔄 [CareersByGroupPage] Loading careers for ${actualGroupSlug} (page: ${page}, query: "${q}")...`);

        setLoading(true);
        try {
            const query = q.trim();
            trackCall(`/api/career-system/groups/${actualGroupSlug}/careers?page=${page}&q=${query}`);
            const resp = await careerGroupService.getCareersByGroup(actualGroupSlug, {
                page,
                pageSize,
                ...(query && { q: query }),
            });

            // Ensure resp exists and has proper structure
            if (resp && resp.items && Array.isArray(resp.items)) {
                setData(resp);
            } else {
                console.error('❌ [CareersByGroupPage] Invalid API response:', resp);
                setData({ items: [], total: 0, limit: pageSize, offset: 0, group: { id: 0, name: '', slug: actualGroupSlug } });
            }

            window.scrollTo({ top: 0, behavior: 'smooth' });

            console.log(`✅ [CareersByGroupPage] Loaded ${resp?.items?.length || 0} careers (total: ${resp?.total || 0})`);
        } catch (err) {
            console.error('❌ [CareersByGroupPage] Error loading careers:', err);
        } finally {
            setLoading(false);
        }
    }, [actualGroupSlug, page, pageSize, q]); // Remove trackCall from dependencies

    useEffect(() => {
        fetchCareers();
    }, [fetchCareers]);

    const handleCareerClick = (career: any, isLocked: boolean) => {
        if (isLocked) {
            return;
        }

        // For Basic plan: Check if already reached 25 career limit
        if (currentPlan === 'basic' && !hasFeature('unlimited_careers')) {
            const canView = canUseFeature('career_view');
            if (!canView) {
                window.location.href = '/pricing';
                return;
            }
        }
    };

    if (!actualGroupSlug) {
        return <div>Invalid group</div>;
    }

    const totalPages = data ? Math.max(1, Math.ceil(data.total / pageSize)) : 1;

    // Gradient backgrounds for career cards
    const gradients = [
        'from-green-500 to-teal-600',
        'from-blue-500 to-indigo-600',
        'from-orange-400 to-pink-500',
        'from-purple-500 to-violet-600',
        'from-emerald-400 to-cyan-500',
        'from-rose-400 to-red-500',
    ];

    return (
        <MainLayout>
            <div className="min-h-screen bg-surface-primary dark:bg-gray-900 text-gray-900 dark:text-white relative overflow-hidden pb-20">

                {/* CSS Injection */}
                <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
          .bg-dot-pattern {
            background-image: radial-gradient(#D1D5DB 1px, transparent 1px);
            background-size: 24px 24px;
          }
          .dark .bg-dot-pattern {
            background-image: radial-gradient(#374151 1px, transparent 1px);
          }
          @keyframes fade-in-up { 0% { opacity: 0; transform: translateY(20px); } 100% { opacity: 1; transform: translateY(0); } }
          .animate-fade-in-up { animation: fade-in-up 0.6s ease-out forwards; }
        `}</style>

                {/* Background Layers */}
                <div className="absolute inset-0 bg-dot-pattern pointer-events-none z-0 opacity-40"></div>
                <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-green-500/5 dark:bg-green-500/10 rounded-full blur-[100px] pointer-events-none z-0"></div>

                <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">

                    {/* Header */}
                    <div className="text-center mb-16 animate-fade-in-up">
                        {/* Breadcrumb */}
                        <div className="flex items-center justify-center gap-2 mb-6 text-sm text-gray-500 dark:text-gray-400">
                            <Link to="/careers" className="hover:text-green-600 dark:hover:text-green-400 transition-colors">
                                Lĩnh Vực Nghề Nghiệp
                            </Link>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                            <span className="text-gray-900 dark:text-white font-medium">
                                {data?.group.name || actualGroupSlug}
                            </span>
                        </div>

                        <span className="inline-block py-1.5 px-4 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-bold tracking-widest uppercase mb-6 border border-green-200 dark:border-green-800">
                            {data?.group.name || 'Career Group'}
                        </span>
                        <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 dark:text-white mb-6 tracking-tight leading-tight">
                            Khám Phá <span className="text-green-600 dark:text-green-500">Nghề Nghiệp</span>
                        </h1>
                        <p className="text-xl text-gray-500 dark:text-gray-400 max-w-2xl mx-auto font-medium leading-relaxed mb-10">
                            {data?.group.description || `Khám phá cơ hội nghề nghiệp trong lĩnh vực ${data?.group.name || actualGroupSlug}. Tìm kiếm vai trò phù hợp với kỹ năng và sở thích của bạn.`}
                        </p>

                        {/* Search Bar */}
                        <div className="max-w-2xl mx-auto relative group">
                            <div className="absolute inset-0 bg-green-500/20 rounded-2xl blur-lg group-hover:bg-green-500/30 transition-all duration-300"></div>
                            <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl flex items-center p-2 border border-gray-100 dark:border-gray-700">
                                <div className="pl-4 text-gray-400">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </div>
                                <input
                                    value={q}
                                    onChange={(e) => {
                                        setPage(1);
                                        setQ(e.target.value);
                                    }}
                                    placeholder="Tìm kiếm nghề nghiệp trong lĩnh vực này..."
                                    className="w-full px-4 py-3 bg-transparent border-none text-gray-900 dark:text-white placeholder-gray-400 focus:ring-0 text-lg font-medium"
                                />
                                <button className="hidden sm:block px-6 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-bold hover:opacity-90 transition-opacity">
                                    Tìm kiếm
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Content */}
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-32 animate-pulse">
                            <div className="w-16 h-16 border-4 border-gray-200 dark:border-gray-700 rounded-full border-t-green-600 mb-4 animate-spin"></div>
                            <p className="text-gray-500 font-medium">Đang tải nghề nghiệp...</p>
                        </div>
                    ) : data && data.items.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in-up">
                            {data.items.map((career, index) => {
                                // Check if this career is locked based on subscription
                                const isLocked = (() => {
                                    if (hasFeature('unlimited_careers')) {
                                        return false; // Premium/Pro users can view all careers
                                    }

                                    // For Basic plan: check if exceeded 25 career limit
                                    if (currentPlan === 'basic') {
                                        return !canUseFeature('career_view');
                                    }

                                    // For Free users: check if they have remaining usage
                                    if (currentPlan === 'free') {
                                        const canView = canUseFeature('career_view');
                                        if (!canView) {
                                            return true;
                                        }
                                        return index > 0; // Only allow first career
                                    }

                                    return false;
                                })();

                                const requiredPlan = (() => {
                                    if (!isLocked) return null;
                                    if (currentPlan === 'basic') return 'premium';
                                    return 'basic';
                                })();
                                const requiredPlanInfo = requiredPlan ? getPlanInfo(requiredPlan) : null;

                                const bgGradient = gradients[index % gradients.length];

                                const CardContent = (
                                    <div className={`group bg-white dark:bg-gray-800 rounded-card-hero border border-gray-100 dark:border-gray-700 shadow-xl shadow-gray-200/50 dark:shadow-none hover:shadow-2xl hover:shadow-green-900/10 hover:-translate-y-2 transition-all duration-slow flex flex-col overflow-hidden h-full relative ${isLocked ? 'opacity-75' : ''}`}>

                                        {/* Premium overlay for locked careers */}
                                        {isLocked && (
                                            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-pink-500/10 pointer-events-none z-10">
                                                <div className="absolute top-4 right-4">
                                                    <span className={`px-2 py-1 text-white text-xs font-bold rounded-full flex items-center gap-1 ${requiredPlanInfo?.color === 'blue' ? 'bg-gradient-to-r from-blue-500 to-indigo-500' :
                                                        requiredPlanInfo?.color === 'green' ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
                                                            'bg-gradient-to-r from-purple-500 to-pink-500'
                                                        }`}>
                                                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                                        </svg>
                                                        {requiredPlanInfo?.name || 'PRO'}
                                                    </span>
                                                </div>
                                            </div>
                                        )}

                                        {/* Career Image */}
                                        <div className={`h-40 relative overflow-hidden`}>
                                            <img
                                                src={getCareerImageUrl(career.onet_code, actualGroupSlug || '')}
                                                alt={career.title}
                                                className={`w-full h-full object-cover transition-transform duration-500 ${!isLocked ? 'group-hover:scale-105' : ''}`}
                                                onError={(e) => {
                                                    const target = e.target as HTMLImageElement;
                                                    target.style.display = 'none';
                                                    const fallback = target.nextElementSibling as HTMLElement;
                                                    if (fallback) fallback.classList.remove('hidden');
                                                }}
                                            />
                                            {/* Fallback gradient nếu ảnh lỗi */}
                                            <div className={`absolute inset-0 bg-gradient-to-br ${bgGradient} hidden`}></div>

                                            <div className={`absolute inset-0 ${isLocked ? 'bg-black/40' : 'bg-black/20 group-hover:bg-black/10'} transition-all duration-500`}></div>

                                            {/* Icon overlay */}
                                            <div className={`absolute top-3 right-3 w-10 h-10 ${isLocked ? 'bg-black/40' : 'bg-white/20'} backdrop-blur-md rounded-xl flex items-center justify-center border border-white/30 text-white shadow-lg ${!isLocked ? 'group-hover:scale-110' : ''} transition-transform duration-300`}>
                                                {isLocked ? (
                                                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                                        <path d="M12 2C9.79 2 8 3.79 8 6v2H7c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2h-1V6c0-2.21-1.79-4-4-4zm0 2c1.1 0 2 .9 2 2v2h-4V6c0-1.1.9-2 2-2z" />
                                                    </svg>
                                                ) : (
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                                    </svg>
                                                )}
                                            </div>
                                        </div>

                                        {/* Content */}
                                        <div className="p-6 flex-grow flex flex-col">
                                            <div className="mb-4">
                                                <h3 className={`text-lg font-bold mb-2 line-clamp-2 h-12 transition-colors ${isLocked
                                                    ? 'text-gray-600 dark:text-gray-400'
                                                    : 'text-gray-900 dark:text-white group-hover:text-green-600 dark:group-hover:text-green-400'
                                                    }`}>
                                                    {career.title}
                                                </h3>
                                                <div className={`w-8 h-1 rounded-full transition-colors ${isLocked
                                                    ? 'bg-gray-200 dark:bg-gray-600'
                                                    : 'bg-gray-100 dark:bg-gray-700 group-hover:bg-green-500'
                                                    }`}></div>
                                            </div>

                                            <p className={`text-sm line-clamp-3 flex-grow mb-4 leading-relaxed ${isLocked
                                                ? 'text-gray-400 dark:text-gray-500'
                                                : 'text-gray-500 dark:text-gray-400'
                                                }`}>
                                                {isLocked
                                                    ? (() => {
                                                        if (currentPlan === 'free') {
                                                            const canView = canUseFeature('career_view');
                                                            if (!canView) {
                                                                return `Nâng cấp lên Gói Cơ Bản (99k) để xem nghề nghiệp này.`;
                                                            } else {
                                                                return `Nâng cấp lên Gói Cơ Bản (99k) để xem thêm nghề nghiệp.`;
                                                            }
                                                        } else if (currentPlan === 'basic') {
                                                            return `Nâng cấp lên Gói Cao Cấp (199k) để truy cập không giới hạn.`;
                                                        } else {
                                                            return `Nâng cấp lên ${requiredPlanInfo?.name || 'Cao Cấp'} để xem nghề nghiệp này.`;
                                                        }
                                                    })()
                                                    : (career.short_desc || career.description || 'Khám phá con đường nghề nghiệp thú vị này và xem liệu nó có phù hợp với hồ sơ của bạn không.')
                                                }
                                            </p>

                                            <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-100 dark:border-gray-700">
                                                <span className={`text-xs font-bold uppercase tracking-wider ${isLocked ? 'text-gray-300 dark:text-gray-600' : 'text-gray-400'
                                                    }`}>
                                                    {isLocked ? 'Đã khóa' : 'Có sẵn'}
                                                </span>
                                                <div className={`flex items-center text-sm font-bold transition-transform ${isLocked
                                                    ? 'text-purple-600 dark:text-purple-400'
                                                    : 'text-green-600 dark:text-green-400 group-hover:translate-x-1'
                                                    }`}>
                                                    {isLocked ? (
                                                        <>
                                                            Nâng cấp
                                                            <svg className="w-4 h-4 ml-1" fill="currentColor" viewBox="0 0 24 24">
                                                                <path d="M12 2C9.79 2 8 3.79 8 6v2H7c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2h-1V6c0-2.21-1.79-4-4-4zm0 2c1.1 0 2 .9 2 2v2h-4V6c0-1.1.9-2 2-2z" />
                                                            </svg>
                                                        </>
                                                    ) : (
                                                        <>
                                                            Chi tiết
                                                            <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                                            </svg>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );

                                return isLocked ? (
                                    <Link
                                        key={career.id}
                                        to="/pricing"
                                        state={{
                                            feature: 'career_recommendations',
                                            message: currentPlan === 'free'
                                                ? (canUseFeature('career_view')
                                                    ? `Nâng cấp lên Gói Cơ Bản để xem nghề nghiệp này.`
                                                    : `Bạn đã dùng hết lượt xem miễn phí. Nâng cấp để xem thêm.`)
                                                : `Bạn đã xem đủ 25 nghề nghiệp trong Gói Cơ Bản. Nâng cấp lên Cao Cấp để truy cập không giới hạn.`,
                                            requiredPlan: requiredPlan,
                                            redirectTo: `/careers/${actualGroupSlug}/${career.onet_code || career.slug || career.id}`,
                                        }}
                                        onClick={() => handleCareerClick(career, isLocked)}
                                    >
                                        {CardContent}
                                    </Link>
                                ) : (
                                    <Link
                                        key={career.id}
                                        to={`/careers/${actualGroupSlug}/${career.onet_code || career.slug || career.id}`}
                                        state={{ fromCareersPage: true }}
                                        onClick={() => handleCareerClick(career, isLocked)}
                                    >
                                        {CardContent}
                                    </Link>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-32 animate-fade-in-up">
                            <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-400">
                                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Không tìm thấy nghề nghiệp</h3>
                            <p className="text-gray-500 dark:text-gray-400 mb-8">
                                {q ? `Không tìm thấy nghề nghiệp nào khớp với "${q}" trong lĩnh vực này.` : 'Không có nghề nghiệp nào trong lĩnh vực này.'}
                            </p>
                            {q && (
                                <button
                                    onClick={() => setQ('')}
                                    className="px-6 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors mr-4"
                                >
                                    Xóa tìm kiếm
                                </button>
                            )}
                            <button
                                onClick={() => navigate('/careers')}
                                className="px-6 py-2.5 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-colors"
                            >
                                Quay lại Lĩnh Vực Nghề Nghiệp
                            </button>
                        </div>
                    )}

                    {/* Pagination */}
                    {!loading && data && data.total > pageSize && (
                        <div className="mt-16 flex items-center justify-center gap-4 animate-fade-in-up">
                            <button
                                className="w-12 h-12 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
                                disabled={page <= 1}
                                onClick={() => {
                                    setPage((p) => Math.max(1, p - 1));
                                }}
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>

                            <div className="px-6 py-2 bg-white dark:bg-gray-800 rounded-full border border-gray-200 dark:border-gray-700 shadow-sm">
                                <span className="text-sm font-bold text-gray-600 dark:text-gray-300">
                                    Trang <span className="text-gray-900 dark:text-white">{page}</span> / {totalPages}
                                </span>
                            </div>

                            <button
                                className="w-12 h-12 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
                                disabled={page >= totalPages}
                                onClick={() => {
                                    setPage((p) => p + 1);
                                }}
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        </div>
                    )}

                </div>
            </div>
        </MainLayout>
    );
};

export default CareersByGroupPage;