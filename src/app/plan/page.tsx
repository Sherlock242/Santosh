
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

export default function PlanPage() {
  return (
    <>
      <div className="min-h-screen bg-background text-foreground">
        <header className="py-6 px-4 md:px-8 border-b border-border">
          <div className="container mx-auto">
            <h1 className="text-3xl font-logo font-bold">Edengram</h1>
          </div>
        </header>
        <main className="container mx-auto py-12 px-4 md:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl font-bold tracking-tight text-primary">Upgrade to Gold</h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Unlock exclusive features and support the platform.
            </p>
          </div>

          <div className="max-w-md mx-auto mt-16 bg-card p-8 rounded-lg shadow-lg border border-primary/50">
            <h3 className="text-3xl font-bold text-center">Gold Plan</h3>
            <p className="text-center text-muted-foreground mt-2 mb-8">Perfect for creators and supporters.</p>
            
            <ul className="space-y-4 text-left">
              <li className="flex items-center gap-4">
                <Check className="h-6 w-6 text-primary" />
                <span>Get the exclusive Gold Tick next to your name.</span>
              </li>
              <li className="flex items-center gap-4">
                <Check className="h-6 w-6 text-primary" />
                <span>Priority access to new features.</span>
              </li>
              <li className="flex items-center gap-4">
                <Check className="h-6 w-6 text-primary" />
                <span>Faster customer support.</span>
              </li>
              <li className="flex items-center gap-4">
                <Check className="h-6 w-6 text-primary" />
                <span>Directly support the development of Edengram.</span>
              </li>
            </ul>

            <div className="text-center mt-10">
                <p className="text-4xl font-bold">₹99 <span className="text-base font-normal text-muted-foreground">/ month</span></p>
            </div>

            <Button size="lg" className="w-full mt-8" disabled>
              Coming Soon
            </Button>
          </div>
        </main>
      </div>
    </>
  );
}
