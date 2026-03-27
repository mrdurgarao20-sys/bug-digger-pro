import { motion } from "framer-motion";
import { Scan, MessageSquareText, Lightbulb } from "lucide-react";

const features = [
  {
    icon: Scan,
    title: "Auto Error Detection",
    description: "Instantly scans your code and pinpoints bugs, syntax errors, and logical issues with precision.",
  },
  {
    icon: MessageSquareText,
    title: "AI Plain English Explanations",
    description: "No more cryptic error messages. Get clear, beginner-friendly explanations of what went wrong.",
  },
  {
    icon: Lightbulb,
    title: "Learn Why It Happened",
    description: "Understand the root cause so you don't repeat mistakes. Level up your debugging skills over time.",
  },
];

const FeatureCards = () => {
  return (
    <section className="relative z-10 py-24 px-6">
      <div className="container mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl">
        {features.map((feature, i) => (
          <motion.div
            key={feature.title}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.15, duration: 0.5 }}
            className="glass-card glow-border-purple p-8 flex flex-col items-start gap-4 hover:scale-[1.02] transition-transform duration-300"
          >
            <div className="p-3 rounded-lg bg-neon-purple/10 border border-neon-purple/20">
              <feature.icon className="h-6 w-6 text-neon-purple" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">{feature.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
};

export default FeatureCards;
