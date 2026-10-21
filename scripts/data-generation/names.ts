// Fictional name pools per work country. Small pools on purpose: the population repeats names under different IDs.
import type { CountryCode } from "./profiles";

type NamePool = { first: readonly string[]; last: readonly string[] };

export const NAME_POOLS: Readonly<Record<CountryCode, NamePool>> = {
  IN: {
    first: ["Aarav", "Aditi", "Ananya", "Arjun", "Deepa", "Divya", "Ishaan", "Kavya", "Meera", "Neha", "Nikhil", "Pooja", "Priya", "Rahul", "Rohan", "Sanjay", "Sneha", "Vikram"],
    last: ["Agarwal", "Bose", "Desai", "Gupta", "Iyer", "Joshi", "Kapoor", "Kumar", "Menon", "Nair", "Patel", "Rao", "Reddy", "Shah", "Sharma", "Singh", "Verma"],
  },
  US: {
    first: ["Ashley", "Brian", "Chris", "Daniel", "Emily", "Hannah", "Jason", "Jessica", "Kevin", "Laura", "Matthew", "Megan", "Ryan", "Sarah", "Tyler"],
    last: ["Anderson", "Brown", "Davis", "Garcia", "Harris", "Johnson", "Jones", "Martin", "Miller", "Moore", "Smith", "Taylor", "Thomas", "Williams", "Wilson"],
  },
  GB: {
    first: ["Alice", "Amelia", "Charlotte", "Daniel", "George", "Harry", "Isla", "Jack", "James", "Oliver", "Olivia", "Sophie", "Thomas"],
    last: ["Clarke", "Evans", "Green", "Hall", "Hughes", "Jackson", "Lewis", "Roberts", "Turner", "Walker", "White", "Wood", "Wright"],
  },
  DE: {
    first: ["Anna", "Felix", "Hannah", "Jonas", "Julia", "Laura", "Leon", "Lukas", "Maximilian", "Mia", "Paul", "Sophie"],
    last: ["Becker", "Fischer", "Hoffmann", "Koch", "Meyer", "Müller", "Richter", "Schmidt", "Schneider", "Schulz", "Wagner", "Weber"],
  },
  FR: {
    first: ["Camille", "Chloé", "Emma", "Hugo", "Inès", "Jules", "Léa", "Louis", "Lucas", "Manon", "Nathan"],
    last: ["Bernard", "Dubois", "Durand", "Laurent", "Lefebvre", "Leroy", "Martin", "Moreau", "Petit", "Richard", "Thomas"],
  },
  CA: {
    first: ["Benjamin", "Chloe", "Ethan", "Liam", "Noah", "Olivia", "Sophie", "William", "Zoe"],
    last: ["Campbell", "Gagnon", "Lee", "MacDonald", "Martin", "Roy", "Smith", "Tremblay", "Wilson"],
  },
  SG: {
    first: ["Daniel", "Hui Min", "Jia Hui", "Kai Wen", "Li Ting", "Ming", "Priya", "Rachel", "Wei Jie"],
    last: ["Chan", "Goh", "Koh", "Lee", "Lim", "Ng", "Ong", "Tan", "Wong"],
  },
};
