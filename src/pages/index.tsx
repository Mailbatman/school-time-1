import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import { motion } from "framer-motion";
import { useRouter } from "next/router";

export default function Home() {
  const router = useRouter();

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-grow flex flex-col items-center justify-center text-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-3xl"
        >
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-primary">
            Build Your Ideas, Beautifully
          </h1>
          <p className="mt-6 text-lg md:text-xl text-muted-foreground">
            Create stunning web applications with ease. Our platform provides everything you need to bring your vision to life, from authentication to beautiful UI components.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              size="lg"
              onClick={() => router.push('/signup')}
            >
              Get Started
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => router.push('/login')}
            >
              Sign In
            </Button>
          </div>
        </motion.div>
      </main>
      <footer className="py-6 px-4 text-center text-muted-foreground">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.5 }}
        >
          <p>&copy; {new Date().getFullYear()} Your Company. All rights reserved.</p>
        </motion.div>
      </footer>
    </div>
  );
}