-- ============================================
-- SEED DATA FOR core.riasec_labels
-- Author: Tran Chi Tho
-- Date: 2025-11-02
-- ============================================

-- Ensure schema exists
CREATE SCHEMA IF NOT EXISTS core;

-- Create table if missing
CREATE TABLE IF NOT EXISTS core.riasec_labels (
    id BIGSERIAL PRIMARY KEY,
    code TEXT NOT NULL UNIQUE
);

-- Clear existing data (optional for re-run)
TRUNCATE TABLE core.riasec_labels RESTART IDENTITY CASCADE;

-- Seed data
COPY core.riasec_labels (id, code) FROM stdin;
1	R
2	I
3	A
4	S
5	E
6	C
7	RI
8	RA
9	RS
10	RE
11	RC
12	IR
13	IA
14	IS
15	IE
16	IC
17	AR
18	AI
19	AS
20	AE
21	AC
22	SR
23	SI
24	SA
25	SE
26	SC
27	ER
28	EI
29	EA
30	ES
31	EC
32	CR
33	CI
34	CA
35	CS
36	CE
\.
