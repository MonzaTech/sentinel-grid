# Sentinel Grid - Demo Script & Talking Points

> 90-second investor demo walkthrough with presenter notes

## Overview

This demo showcases Sentinel Grid's core value proposition:
- **Predict** infrastructure failures 48 hours in advance
- **Prevent** cascade failures through autonomous mitigation
- **Prove** compliance with immutable blockchain audit trails

---

## Pre-Demo Checklist

- [ ] Terminal set to 120x30 characters minimum
- [ ] Dark theme enabled for visibility
- [ ] Backend running (`cd packages/backend && npm run dev`)
- [ ] Frontend running (`cd packages/frontend && npm run dev`)
- [ ] Browser open to http://localhost:3000
- [ ] Screen recording ready (optional)

### Quick Start
```bash
./demo/demo.sh
```

---

## Demo Flow (90 seconds)

### STEP 1: Infrastructure Overview (0:00 - 0:15)

**Show:** Dashboard with 200 nodes, health metrics

**Say:**
> "This is Sentinel Grid - an AI-powered digital immune system for critical infrastructure. We're monitoring 200 infrastructure nodes across power grid, telecom, water treatment, and data centers in real-time."

**Key Points:**
- Emphasize the scale (200+ nodes)
- Mention diverse infrastructure types
- Point to the health score

**Talking Points:**
- "Each node represents a real piece of critical infrastructure"
- "The AI is constantly analyzing patterns across the entire network"
- "Average outage in this sector costs $2.4M per incident"

---

### STEP 2: Live Simulation (0:15 - 0:25)

**Show:** Start simulation, predictions appearing

**Say:**
> "Let me start the simulation engine. Watch as our AI detects patterns and generates predictions in real-time."

**Key Points:**
- Start the simulation
- Show predictions count increasing
- Highlight the top prediction

**Talking Points:**
- "The AI updates predictions every few seconds"
- "Each prediction includes probability, time-to-event, and recommended actions"
- "This is the same engine that would run in production environments"

---

### STEP 3: Threat Scenario (0:25 - 0:40)

**Show:** Deploy cyber attack threat

**Say:**
> "Now I'll simulate what we see in the real world - a coordinated cyber attack targeting the power grid."

**Key Points:**
- Deploy the threat (75% severity)
- Show predictions escalating
- Point out critical nodes appearing

**Talking Points:**
- "This is modeled after real-world attack patterns"
- "Notice how the AI immediately detects the threat propagation"
- "Traditional monitoring would only see this AFTER the failure"

**Stats to mention:**
- "Colonial Pipeline attack cost $4.4M in ransom alone"
- "2021 Texas grid failure: $195 billion in damage"

---

### STEP 4: Cascade Failure (0:40 - 0:55)

**Show:** Trigger cascade, show propagation

**Say:**
> "Watch what happens when a critical node fails - this is why prediction matters. A single failure cascades through the network."

**Key Points:**
- Trigger cascade from a critical node
- Show affected node count
- Highlight impact score

**Talking Points:**
- "Without prediction, you're reacting AFTER the cascade"
- "With Sentinel Grid, you have 48 hours of warning"
- "That's the difference between a controlled shutdown and a catastrophe"

**Stats to mention:**
- "Average cascade affects 15-25% of connected nodes"
- "Recovery time without prediction: 72+ hours"
- "Recovery time with advance warning: 4-6 hours"

---

### STEP 5: Autonomous Mitigation (0:55 - 1:10)

**Show:** Auto-mitigation activating

**Say:**
> "Sentinel Grid doesn't just predict - it acts. Watch as our autonomous mitigation system stabilizes the network."

**Key Points:**
- Run auto-mitigation
- Show nodes being stabilized
- Highlight risk reduction

**Talking Points:**
- "Each action is optimized based on the specific failure mode"
- "Load shedding, rerouting, isolation - all automated"
- "Human operators receive recommendations, AI handles the urgent response"

**Value Proposition:**
- "60%+ reduction in incident impact"
- "Seconds to respond vs. minutes for human operators"

---

### STEP 6: Blockchain Anchoring (1:10 - 1:25)

**Show:** IPFS pin, signature verification

**Say:**
> "Every prediction and action is cryptographically signed and anchored on-chain - creating an immutable audit trail."

**Key Points:**
- Show the IPFS CID
- Display the cryptographic signature
- Mention regulatory compliance

**Talking Points:**
- "This satisfies NERC CIP, SOC 2, and federal audit requirements"
- "Tamper-proof evidence for incident investigation"
- "Perfect for insurance claims and regulatory reporting"

**Technical details (if asked):**
- "SHA-256 hash + HMAC signature"
- "Pinned to IPFS for distributed storage"
- "Anchored to Base L2 for cost-effective on-chain proof"

---

### STEP 7: Performance Metrics (1:25 - 1:30)

**Show:** Accuracy metrics

**Say:**
> "Our AI achieves military-grade accuracy - 85-95% precision in infrastructure failure prediction."

**Key Points:**
- Accuracy: 85-95%
- Precision and Recall metrics
- F1 Score

**Talking Points:**
- "Trained on real infrastructure failure data"
- "Validated by defense industry partners"
- "Continuous learning improves with each deployment"

---

## Closing Statement

> "Sentinel Grid gives infrastructure operators something they've never had before: the ability to see the future. 48 hours of advance warning. Autonomous response. Immutable compliance. That's the digital immune system for critical infrastructure."

---

## Q&A Preparation

### Common Questions

**Q: How is this different from existing SCADA monitoring?**
> "SCADA tells you what's happening NOW. Sentinel Grid tells you what's going to happen in 48 HOURS. We're not replacing SCADA - we're the predictive layer on top."

**Q: What data do you need?**
> "Standard telemetry: load, temperature, voltage, network topology. We integrate with existing SCADA/EMS systems via standard protocols."

**Q: How long to deploy?**
> "Proof of value in 2-4 weeks. Full production deployment in 60-90 days."

**Q: What about false positives?**
> "Our precision rate is 85-95%. Every prediction includes a confidence score. Operators can set thresholds based on their risk tolerance."

**Q: Is this AI or rules-based?**
> "Both. We use physics-informed AI - machine learning enhanced with domain knowledge about infrastructure behavior. This gives us accuracy that pure ML can't achieve."

**Q: What's the business model?**
> "SaaS subscription based on monitored nodes. Typical deployment: $2,500-10,000/month. That's a fraction of the cost of a single outage."

---

## Demo Variations

### 5-Minute Deep Dive
Run full demo plus:
- Show network topology visualization
- Demonstrate manual threat deployment
- Walk through prediction details
- Show audit log

### 15-Minute Technical Demo
All of the above plus:
- API endpoint walkthrough
- WebSocket real-time updates
- Smart contract integration (if deployed)
- Architecture overview

### 30-Minute Workshop
Full technical deep dive:
- Code walkthrough
- Local deployment
- Custom scenario creation
- Integration discussion

---

## Recording Tips

1. **Resolution**: 1920x1080 minimum
2. **Terminal**: Dark theme, large font (16pt+)
3. **Browser**: Hide bookmarks bar, zoom to 110%
4. **Audio**: Use external mic, record in quiet room
5. **Pacing**: Pause 2 seconds between major steps
6. **Mistakes**: Keep going - authenticity matters

### Recommended Tools
- OBS Studio (free)
- Loom (quick sharing)
- CleanShot X (Mac)

---

## Contact

**Alexandre** - Founder, Monza Tech LLC
- Email: alexandre@monzatech.io
- LinkedIn: /in/alexandre-monza
- Web: https://sentinelgrid.io

**Programs:**
- AFRL HUSTLE Defense Accelerator
- NEXT-HI Innovation Program
