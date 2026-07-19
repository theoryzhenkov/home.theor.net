{
  description = "home.theor.net Astro website development environment";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { nixpkgs, flake-utils, ... }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
      in
      {
        devShells.default = pkgs.mkShell {
          packages = with pkgs; [
            # Project runtime/toolchain
            bun
            nodejs_24

            # Task runners and repository tooling
            git
            jujutsu
            just

            # Template and secrets tooling from the base template
            copier
            age
            sops

            # Helpful project utilities
            docker-client
            jq
            ripgrep
          ];

          env = {
            ASTRO_TELEMETRY_DISABLED = "1";
            SOPS_AGE_KEY_FILE = "$PWD/.age-key";
          };

          shellHook = ''
            FLAKE_ROOT="$PWD"
            while [ "$FLAKE_ROOT" != "/" ] && [ ! -f "$FLAKE_ROOT/flake.nix" ]; do
              FLAKE_ROOT="$(dirname "$FLAKE_ROOT")"
            done

            if [ ! -f "$FLAKE_ROOT/flake.nix" ]; then
              FLAKE_ROOT="$PWD"
            fi

            export FLAKE_ROOT
            export SOPS_AGE_KEY_FILE="$FLAKE_ROOT/.age-key"
            export PATH="$FLAKE_ROOT/node_modules/.bin:$PATH"
          '';
        };
      });
}
