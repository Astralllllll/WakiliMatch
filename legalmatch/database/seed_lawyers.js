/**
 * database/seed_lawyers.js
 * Seed script with 15 fictional verified lawyers across Kenya practice areas
 * for demonstration and testing of the matching engine.
 * Run via: node database/seed_lawyers.js
 */
import crypto from 'crypto';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

delete process.env.DB_PASSWORD;
delete process.env.PGPASSWORD;

const SEED_LAWYERS = [
  {
    fullName: "Adv. Sarah Mwangi",
    email: "sarah.mwangi@wakilimatch.seed",
    lskNumber: "LSK/2015/1023",
    biography: "Experienced family law practitioner specializing in divorce, child custody, and succession disputes in Nairobi.",
    specializations: "Family & Succession, Divorce, Child Custody, Probate",
    yearsOfExperience: 9,
    courts: "High Court Family Division, Nairobi, Magistrates Court",
    academicQualifications: "LL.B (University of Nairobi), Diploma in Law (KSL)",
    priceGuidance: "KES 50,000 - 150,000 per matter",
    successRate: "92%",
  },
  {
    fullName: "Adv. David Kiprop",
    email: "david.kiprop@wakilimatch.seed",
    lskNumber: "LSK/2014/0891",
    biography: "Criminal defense advocate with extensive trial experience in Nakuru and Eldoret high courts.",
    specializations: "Criminal, White Collar Crime, Constitutional Petitions",
    yearsOfExperience: 12,
    courts: "High Court of Kenya, Nakuru Law Courts",
    academicQualifications: "LL.B (Moi University), LL.M (UoN)",
    priceGuidance: "KES 80,000 - 300,000 per trial",
    successRate: "88%",
  },
  {
    fullName: "Adv. Amina Mohamed",
    email: "amina.mohamed@wakilimatch.seed",
    lskNumber: "LSK/2018/4412",
    biography: "Corporate and commercial lawyer assisting startups, mergers, and tax dispute resolutions.",
    specializations: "Commercial & Contract, Tax, Corporate Governance, Banking",
    yearsOfExperience: 7,
    courts: "Commercial and Tax Division, Milimani",
    academicQualifications: "LL.B (Strathmore University)",
    priceGuidance: "KES 100,000 retainer upwards",
    successRate: "95%",
  },
  {
    fullName: "Adv. Brian Ochieng",
    email: "brian.ochieng@wakilimatch.seed",
    lskNumber: "LSK/2016/2219",
    biography: "Specialist in land conveyancing, title deed disputes, and Environment and Land Court litigation.",
    specializations: "Land & Property, Conveyancing, Environmental Law",
    yearsOfExperience: 10,
    courts: "Environment and Land Court (ELC), Kisumu and Nairobi",
    academicQualifications: "LL.B (Kenyatta University)",
    priceGuidance: "KES 40,000 - 120,000",
    successRate: "90%",
  },
  {
    fullName: "Adv. Faith Wanjiku",
    email: "faith.wanjiku@wakilimatch.seed",
    lskNumber: "LSK/2019/5531",
    biography: "Employment and labor relations expert representing employees and employers at the ELRC.",
    specializations: "Employment & Labour, Industrial Relations, Wrongful Termination",
    yearsOfExperience: 6,
    courts: "Employment and Labour Relations Court (ELRC)",
    academicQualifications: "LL.B (Catholic University of Eastern Africa)",
    priceGuidance: "KES 30,000 - 90,000",
    successRate: "89%",
  },
  {
    fullName: "Adv. James Otieno",
    email: "james.otieno@wakilimatch.seed",
    lskNumber: "LSK/2012/0114",
    biography: "Constitutional lawyer and human rights litigator with landmark Supreme Court appearances.",
    specializations: "Constitutional & Administrative, Judicial Review, Human Rights",
    yearsOfExperience: 14,
    courts: "Supreme Court of Kenya, Court of Appeal",
    academicQualifications: "LL.B (UoN), LL.M (Harvard)",
    priceGuidance: "KES 150,000 upwards",
    successRate: "94%",
  },
  {
    fullName: "Adv. Carol Chebet",
    email: "carol.chebet@wakilimatch.seed",
    lskNumber: "LSK/2020/7789",
    biography: "Civil litigation and insurance claim disputes specialist based in Eldoret.",
    specializations: "Civil Litigation, Insurance Claims, Tort Law",
    yearsOfExperience: 5,
    courts: "Eldoret Chief Magistrate and High Courts",
    academicQualifications: "LL.B (Kabarak University)",
    priceGuidance: "KES 25,000 - 70,000",
    successRate: "86%",
  },
  {
    fullName: "Adv. George Mutua",
    email: "george.mutua@wakilimatch.seed",
    lskNumber: "LSK/2013/1542",
    biography: "Tax dispute advocate handling KRA audits, VAT disputes, and customs appeals.",
    specializations: "Tax, Commercial & Contract, Revenue Appeals Tribunal",
    yearsOfExperience: 11,
    courts: "Tax Appeals Tribunal, High Court Commercial Division",
    academicQualifications: "LL.B (UoN), CPA (K)",
    priceGuidance: "KES 90,000 upwards",
    successRate: "91%",
  },
  {
    fullName: "Adv. Mercy Naliaka",
    email: "mercy.naliaka@wakilimatch.seed",
    lskNumber: "LSK/2017/3309",
    biography: "Intellectual property lawyer registering trademarks, patents, and copyright infringement claims.",
    specializations: "Intellectual Property, Technology Law, Corporate",
    yearsOfExperience: 8,
    courts: "Kenya Industrial Property Institute (KIPI), High Court",
    academicQualifications: "LL.B (Strathmore University)",
    priceGuidance: "KES 45,000 - 130,000",
    successRate: "93%",
  },
  {
    fullName: "Adv. Kevin Juma",
    email: "kevin.juma@wakilimatch.seed",
    lskNumber: "LSK/2015/1988",
    biography: "Real estate and property development legal consultant.",
    specializations: "Land & Property, Conveyancing, Mortgages",
    yearsOfExperience: 9,
    courts: "ELC Nairobi",
    academicQualifications: "LL.B (UoN)",
    priceGuidance: "KES 50,000 flat or percentage scale",
    successRate: "90%",
  },
  {
    fullName: "Adv. Esther Njeri",
    email: "esther.njeri@wakilimatch.seed",
    lskNumber: "LSK/2018/4902",
    biography: "Family law advocate focusing on adoption, matrimonial property, and custody.",
    specializations: "Family & Succession, Matrimonial Property, Adoption",
    yearsOfExperience: 7,
    courts: "High Court Family Division",
    academicQualifications: "LL.B (Mount Kenya University)",
    priceGuidance: "KES 35,000 - 95,000",
    successRate: "88%",
  },
  {
    fullName: "Adv. Peter Kamau",
    email: "peter.kamau@wakilimatch.seed",
    lskNumber: "LSK/2011/0055",
    biography: "Senior criminal defense and anti-corruption litigator.",
    specializations: "Criminal, Anti-Corruption, Judicial Review",
    yearsOfExperience: 15,
    courts: "Anti-Corruption Court, High Court",
    academicQualifications: "LL.B (UoN)",
    priceGuidance: "KES 200,000 retainer",
    successRate: "87%",
  },
  {
    fullName: "Adv. Halima Abdi",
    email: "halima.abdi@wakilimatch.seed",
    lskNumber: "LSK/2019/6620",
    biography: "Employment lawyer handling wrongful dismissal and union negotiations.",
    specializations: "Employment & Labour, Collective Bargaining",
    yearsOfExperience: 6,
    courts: "ELC Mombasa",
    academicQualifications: "LL.B (Daystar University)",
    priceGuidance: "KES 30,000 - 80,000",
    successRate: "92%",
  },
  {
    fullName: "Adv. Tom Mboya",
    email: "tom.mboya@wakilimatch.seed",
    lskNumber: "LSK/2014/1211",
    biography: "Commercial arbitration and cross-border trade legal expert.",
    specializations: "Commercial & Contract, Arbitration, International Trade",
    yearsOfExperience: 12,
    courts: "LCIA, Nairobi Centre for International Arbitration (NCIA)",
    academicQualifications: "LL.B (UoN), LL.M (London)",
    priceGuidance: "KES 150,000 upwards",
    successRate: "96%",
  },
  {
    fullName: "Adv. Susan Wamaitha",
    email: "susan.wamaitha@wakilimatch.seed",
    lskNumber: "LSK/2016/2994",
    biography: "Succession and estate planning lawyer managing wills, trusts, and probate administration.",
    specializations: "Family & Succession, Estate Planning, Trusts",
    yearsOfExperience: 10,
    courts: "High Court Probate and Administration",
    academicQualifications: "LL.B (UoN)",
    priceGuidance: "KES 40,000 - 110,000",
    successRate: "94%",
  },
];

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, salt, 64, { N: 2 ** 14 }).toString("hex");
  return `${salt}:${derived}`;
}

async function seed() {
  console.log("Seeding 15 fictional verified lawyers...");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const l of SEED_LAWYERS) {
      const userRes = await client.query(
        `INSERT INTO Users (email, password_hash, role, full_name)
         VALUES ($1, $2, 'Lawyer', $3)
         ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name
         RETURNING user_id`,
        [l.email, hashPassword("Password123!"), l.fullName]
      );
      const userId = userRes.rows[0].user_id;

      await client.query(
        `INSERT INTO LawyerProfiles (user_id, lsk_registration_number, full_name, biography, specializations, years_of_experience, courts, academic_qualifications, price_guidance, success_rate, is_verified)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true)
         ON CONFLICT (lsk_registration_number) DO UPDATE SET
           biography = EXCLUDED.biography,
           specializations = EXCLUDED.specializations,
           is_verified = true`,
        [userId, l.lskNumber, l.fullName, l.biography, l.specializations, l.yearsOfExperience, l.courts, l.academicQualifications, l.priceGuidance, l.successRate]
      );
    }
    await client.query("COMMIT");
    console.log("Successfully seeded 15 verified lawyers!");
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("Seeding failed:", err.message);
    process.exit(1);
  } finally {
    client.release();
    pool.end();
  }
}

seed();
