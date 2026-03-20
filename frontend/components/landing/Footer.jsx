export default function Footer() {
  return (
    <footer className="border-t border-white/[0.06] py-12">
      <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <img src="/fafnir-logo.png" alt="Fafnir" className="w-8 h-8 rounded-full" />
          <div>
            <span className="font-bold text-fafnir-text tracking-[0.1em]">FAFNIR</span>
            <p className="text-xs text-fafnir-muted">
              AI agent that saves and grows your money
            </p>
          </div>
        </div>

        {/* Links */}
        <div className="flex gap-6 text-sm text-fafnir-muted">
          <a href="#how-it-works" className="hover:text-fafnir-text transition-colors">
            How it Works
          </a>
          <a href="#security" className="hover:text-fafnir-text transition-colors">
            Security
          </a>
          <a href="#" className="hover:text-fafnir-text transition-colors">
            About
          </a>
          <a href="#" className="hover:text-fafnir-text transition-colors">
            GitHub
          </a>
        </div>

        {/* Hedera */}
        <div className="text-sm text-fafnir-muted">Built on Hedera ◆</div>
      </div>

      <div className="text-center text-xs text-fafnir-muted/40 mt-8">
        &copy; 2026 Fafnir. All transactions on Hedera Testnet.
      </div>
    </footer>
  );
}
