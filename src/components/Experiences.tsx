type Experience = {
  company: string;
  duration: string;
  start_date: string;
  end_date: string;
  job_title: string;
  description: string;
  company_img: string;
};

type ExperienceProps = {
  experiences: Experience[];
};

const Experiences: React.FC<ExperienceProps> = ({ experiences }) => {
  const groupedExperiences = experiences.reduce((acc, exp) => {
    const key = `${exp.company}-${exp.company_img}`;
    if (!acc[key]) {
      acc[key] = {
        company: exp.company,
        company_img: exp.company_img,
        roles: [],
      };
    }
    acc[key].roles.push(exp);
    return acc;
  }, {} as Record<string, { company: string; company_img: string; roles: Experience[] }>);

  return (
    <section className="px-2 py-8 md:px-4">
      <div className="relative max-w-6xl mx-auto">
        <h2 className="text-2xl md:text-4xl font-bold mb-6 md:mb-10 text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">
          Professional Journey
        </h2>

        {/* Timeline - Hidden on mobile */}
        <div className="hidden md:block absolute left-1/2 w-1 h-full bg-gradient-to-b from-yellow-500/20 to-transparent transform -translate-x-1/2" />

        {Object.values(groupedExperiences).map(
          ({ company, company_img, roles }, companyIndex) => (
            <div
              key={company}
              className={`relative mb-6 md:mb-10 flex flex-col md:${
                companyIndex % 2 === 0 ? "flex-row" : "flex-row"
              } items-center justify-between gap-4 md:gap-6`}
            >
              {/* Company Logo */}
              <div className="relative z-10  w-12 h-12 md:w-20 md:h-20 rounded-full border-2 md:border-3 border-yellow-500/30 bg-[#1a1a1a] p-1 md:p-2 transition-all duration-300">
                <img
                  src={company_img}
                  alt={company}
                  className="w-full h-full rounded-full object-contain"
                />
              </div>

              {/* Roles Card */}
              <div className={`flex-1 w-full md:${
                companyIndex % 2 === 0 ? "md:ml-4" : "md:mr-4"
              }`}>
                <div className="bg-gradient-to-br from-[#1a1a1a] to-[#101010] rounded-xl p-4 md:p-6 shadow-md transition-shadow duration-300">
                  <h3 className="text-xl md:text-2xl font-bold mb-3 flex flex-col md:flex-row md:items-center gap-1">
                    <span className="truncate">{company}</span>
                    <span className="text-xs md:text-sm text-yellow-500/70 font-normal">
                      {roles.length > 1 ? `${roles.length} roles` : "1 role"}
                    </span>
                  </h3>

                  <div className="space-y-4">
                    {roles
                      .sort(
                        (a, b) =>
                          new Date(b.start_date).getTime() -
                          new Date(a.start_date).getTime()
                      )
                      .map((role, index) => (
                        <div
                          key={index}
                          className="pb-3 md:pb-4 border-b border-white/10 last:border-0 transition-all duration-300"
                        >
                          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-1">
                            <div>
                              <h4 className="text-lg md:text-xl font-semibold">
                                {role.job_title}
                              </h4>
                              <p className="text-xs md:text-sm text-yellow-500/80">
                                {role.duration}
                              </p>
                            </div>
                          </div>
                          <p className="text-white/80 text-xs md:text-sm leading-relaxed">
                            {role.description}
                          </p>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          )
        )}
      </div>
    </section>
  );
};

export default Experiences;
