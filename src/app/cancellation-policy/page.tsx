
export default function CancellationPolicyPage() {
  return (
    <>
      <div className="min-h-screen bg-background text-foreground">
        <header className="py-6 px-4 md:px-8 border-b border-border">
          <div className="container mx-auto">
              <h1 className="text-3xl font-logo font-bold">Edengram</h1>
          </div>
        </header>
        <main className="container mx-auto py-12 px-4 md:px-8">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-4xl font-bold tracking-tight text-primary mb-8">Cancellation & Refund Policy</h2>
            <div className="space-y-6 text-muted-foreground">
              <p>Last Updated: August 18, 2025</p>

              <h3 className="text-2xl font-semibold text-foreground pt-4">General Policy</h3>
              <p>
                Thank you for supporting Edengram. Our goal is to provide a seamless and valuable experience with our premium features, such as the Gold Plan.
              </p>
              
              <h3 className="text-2xl font-semibold text-foreground pt-4">Cancellations</h3>
              <p>
                Since our premium services are delivered instantly upon a one-time payment, we do not offer cancellations. Once a payment is made and the service is activated, it is considered final.
              </p>

              <h3 className="text-2xl font-semibold text-foreground pt-4">Refunds</h3>
              <p>
                <strong>All payments are non-refundable.</strong> We do not provide refunds or credits for any purchases.
              </p>
              <p>
                This policy is in place because our services are digital and instantly accessible. Furthermore, as a small, growing platform, the processing fees and administrative costs associated with refunds create significant losses that we cannot bear at this time. We believe in transparency and want to be upfront about this policy before you make a purchase.
              </p>
              <p>
                We encourage you to use the free version of our platform thoroughly to ensure it meets your needs before deciding to upgrade.
              </p>

              <h3 className="text-2xl font-semibold text-foreground pt-4">Contact Us</h3>
              <p>
                If you have any questions about this policy, please feel free to contact us at <a href="mailto:contact@edengram.com" className="text-primary hover:underline">contact@edengram.com</a> before making a purchase.
              </p>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
