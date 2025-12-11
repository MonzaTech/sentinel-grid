#!/bin/bash
#
# Sentinel Grid - Screen Recording Helper
# Creates a polished demo video
#
# Usage: ./demo/record-demo.sh [output-name]
#

set -e

OUTPUT_NAME="${1:-sentinel-grid-demo}"
OUTPUT_DIR="$(pwd)/recordings"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
OUTPUT_FILE="$OUTPUT_DIR/${OUTPUT_NAME}-${TIMESTAMP}.mp4"

# Colors
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BOLD='\033[1m'
NC='\033[0m'

echo ""
echo -e "${CYAN}${BOLD}🎬 Sentinel Grid - Demo Recording Setup${NC}"
echo "══════════════════════════════════════════════════════"
echo ""

# Check for recording tools
RECORDER=""
if command -v ffmpeg &> /dev/null; then
  RECORDER="ffmpeg"
elif command -v obs &> /dev/null; then
  RECORDER="obs"
fi

# Pre-recording checklist
echo -e "${BOLD}📋 Pre-Recording Checklist${NC}"
echo ""
echo "  Terminal Setup:"
echo "    [ ] Terminal size: 120x30 characters minimum"
echo "    [ ] Font size: 16pt or larger"
echo "    [ ] Dark theme enabled"
echo "    [ ] No sensitive data visible"
echo ""
echo "  Browser Setup (if showing dashboard):"
echo "    [ ] Bookmarks bar hidden"
echo "    [ ] Zoom level: 110%"
echo "    [ ] No extensions visible"
echo "    [ ] Dashboard loaded: http://localhost:3000"
echo ""
echo "  Audio (if recording voiceover):"
echo "    [ ] External microphone connected"
echo "    [ ] Quiet environment"
echo "    [ ] Test recording done"
echo ""
echo "  Content:"
echo "    [ ] Backend running (cd packages/backend && npm run dev)"
echo "    [ ] Frontend running (cd packages/frontend && npm run dev)"
echo "    [ ] Validation passed (./demo/validate.sh)"
echo ""

read -p "Press ENTER when ready to continue..."

# Create output directory
mkdir -p "$OUTPUT_DIR"

echo ""
echo -e "${BOLD}📹 Recording Instructions${NC}"
echo ""
echo "  1. Start your screen recording software"
echo "     - OBS Studio (recommended)"
echo "     - QuickTime (Mac)"
echo "     - Any screen recorder"
echo ""
echo "  2. Recording settings:"
echo "     - Resolution: 1920x1080"
echo "     - Frame rate: 30fps"
echo "     - Format: MP4 (H.264)"
echo ""
echo "  3. Run the demo:"
echo -e "     ${CYAN}./demo/demo.sh${NC}"
echo ""
echo "  4. During recording:"
echo "     - Speak clearly and slowly"
echo "     - Pause 2 seconds between steps"
echo "     - Point out key metrics"
echo ""
echo "  5. Suggested timeline:"
echo "     - 0:00-0:15  Infrastructure overview"
echo "     - 0:15-0:25  Start simulation"
echo "     - 0:25-0:40  Deploy threat"
echo "     - 0:40-0:55  Cascade failure"
echo "     - 0:55-1:10  Auto-mitigation"
echo "     - 1:10-1:25  Blockchain anchoring"
echo "     - 1:25-1:30  Performance metrics"
echo ""

# If ffmpeg available, offer automated recording
if [ "$RECORDER" = "ffmpeg" ]; then
  echo -e "${YELLOW}FFmpeg detected - automated recording available${NC}"
  echo ""
  read -p "Start automated terminal recording? (y/N) " -n 1 -r
  echo ""
  
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo -e "${GREEN}Starting recording...${NC}"
    echo "Output: $OUTPUT_FILE"
    echo ""
    echo -e "${YELLOW}Press 'q' to stop recording${NC}"
    echo ""
    
    # Record terminal (Linux/Mac)
    if [[ "$OSTYPE" == "darwin"* ]]; then
      # macOS
      ffmpeg -f avfoundation -i "0:0" -c:v libx264 -preset ultrafast -crf 18 "$OUTPUT_FILE"
    else
      # Linux
      ffmpeg -video_size 1920x1080 -framerate 30 -f x11grab -i :0.0 \
             -c:v libx264 -preset ultrafast -crf 18 "$OUTPUT_FILE"
    fi
    
    echo ""
    echo -e "${GREEN}Recording saved: $OUTPUT_FILE${NC}"
  fi
else
  echo -e "${YELLOW}Tip: Install ffmpeg for automated recording${NC}"
  echo "     brew install ffmpeg (Mac)"
  echo "     apt install ffmpeg (Linux)"
fi

echo ""
echo -e "${BOLD}📤 Post-Recording${NC}"
echo ""
echo "  1. Trim beginning/end if needed"
echo "  2. Add intro/outro slides (optional)"
echo "  3. Export in these formats:"
echo "     - 1080p for presentations"
echo "     - 720p for web/email"
echo "     - GIF for README (first 10 seconds)"
echo ""
echo "  Recommended tools:"
echo "     - DaVinci Resolve (free, professional)"
echo "     - iMovie (Mac, simple)"
echo "     - Loom (quick sharing)"
echo ""
echo "  Upload destinations:"
echo "     - YouTube (unlisted for investors)"
echo "     - Loom (shareable links)"
echo "     - Google Drive (pitch decks)"
echo ""
echo -e "${CYAN}${BOLD}🎬 Happy recording!${NC}"
echo ""
