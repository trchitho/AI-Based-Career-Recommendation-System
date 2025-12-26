/**
 * RIASECPage4Careers - Careers to Explore intro page
 * 
 * Shows introduction text before career matches
 * Based on Truity Career Personality Profiler format
 */

const RIASECPage4Careers = () => {
    return (
        <div className="h-full flex flex-col overflow-hidden">
            {/* Page Title */}
            <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-5 print:text-xl print:mb-4">
                Careers to Explore
            </h2>

            {/* Intro Text */}
            <div className="space-y-5 text-sm text-gray-700 dark:text-gray-300 leading-relaxed print:text-xs print:space-y-4">
                <p>
                    In this section, we'll show you the top careers that match your interest profile. There are a few things to keep in mind as you read over these career suggestions:
                </p>

                <div>
                    <p className="mb-2">
                        <span className="font-bold">1. These career titles are just a starting point.</span> The careers listed here are among the most commonly found in the labor market and are careers that many people will recognize. However, many people have jobs that don't exactly fit any of the descriptions listed here. You might end up with a job that combines several of these typical roles. You might have a job that's specific to one company or industry. Or you might invent a new career altogether! In short, do not limit your imagination to the jobs listed here. These are a representative sample of jobs that fit your personality, but they do not cover every possibility or opportunity that you'll come across in your career path.
                    </p>
                </div>

                <div>
                    <p className="mb-2">
                        <span className="font-bold">2. Your individuality is key.</span> The careers in this section are listed generally by how well they fit your interest profile. However, you should not assume that the first career on the list is the best career for you, or that the second career listed is the second-best, and so on. You may find careers that spark your interest anywhere on this list. You may also see several careers that do not interest you at all. This is normal and does not mean that your results are not accurate! Everyone is unique, and even someone with an identical interest profile to yours will have different inclinations, passions, and preferences. So while this assessment can point you in the right general direction and give you some good ideas to get started, the ultimate choice of your best career will be up to you.
                    </p>
                </div>

                <div>
                    <p className="mb-2">
                        <span className="font-bold">3. Ultimately, the choice is yours.</span> Because no assessment can tell you exactly which career will be perfect for you, the best way to think of this list is as a starting point for your career research. You can use this list to get ideas of careers that may suit you, but you'll still need to read more about each career that interests you, do real-world research (like interviewing or shadowing people in the field), and evaluate each career according to your own personal criteria. For now, just read over this list with an open mind. See if any career ideas stand out as particularly interesting, and which seem worthy of further inspection.
                    </p>
                </div>

                <p className="font-semibold text-base text-gray-900 dark:text-white mt-5 print:mt-4 print:text-sm">
                    With that in mind, let's look at some careers.
                </p>
            </div>
        </div>
    );
};

export default RIASECPage4Careers;
