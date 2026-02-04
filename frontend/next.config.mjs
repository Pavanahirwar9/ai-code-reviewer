import MonacoWebpackPlugin from 'monaco-editor-webpack-plugin';

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  webpack: (config, { isServer }) => {
    // Monaco Editor configuration (client-side only)
    if (!isServer) {
      config.plugins.push(
        new MonacoWebpackPlugin({
          // Supported languages
          languages: [
            'javascript',
            'typescript',
            'css',
            'html',
            'json',
            'python',
            'java',
            'cpp',
            'c',
            'csharp',
            'php',
            'ruby',
            'go',
            'rust',
            'swift',
            'kotlin',
            'scala',
            'markdown',
            'xml',
          ],
          // Editor features to include
          features: [
            'coreCommands',
            'find',
            'bracketMatching',
            'caretOperations',
            'clipboard',
            'comment',
            'contextmenu',
            'suggest',
            'folding',
            'format',
            'hover',
            'wordHighlighter',
            'lineSelection',
            'linesOperations',
          ],
        })
      );
    }
    return config;
  },
}

export default nextConfig

