# System Design Simulator

An interactive system-design simulator that models how backend architectures behave under varying traffic patterns, scaling decisions, and architectural trade-offs.

The simulator helps visualize **bottlenecks**, **p50/p95 latency**, **error rates**, and **cost trade-offs** in real time — focusing on the behaviors senior engineers reason about when designing scalable systems.

---

## ✨ What This Simulator Does

This simulator models a simplified backend architecture:

**Clients → Load Balancer → App Tier → Cache → Database**

By adjusting traffic and capacity knobs, you can observe:
- Which tier becomes the bottleneck
- How tail latency (p95) explodes near saturation
- When errors begin to appear
- Why scaling the wrong tier doesn’t fix the system
- How cost shifts as architecture changes

The goal is **directional correctness and intuition**, not exact production prediction.

---

## 🧠 Core Concepts Modeled

### Saturation-Driven Behavior
Each tier has capacity. When load approaches capacity:
- Latency increases non-linearly
- p95 rises faster than p50
- Errors appear once saturation exceeds 100%

### Bottleneck-First Thinking
The system bottleneck is always the tier with the **highest saturation**.
Scaling non-bottleneck tiers produces little or no improvement.

### Trade-offs Over “Right Answers”
Every improvement has a cost:
- More instances → higher compute cost
- More cache → higher cache cost
- DB replication/partitioning → higher DB cost and complexity

---

## 🎛️ What You Can Configure

### Traffic
- Requests per second (RPS)
- Read / write ratio
- Payload size

### App Tier
- Number of instances
- RPS per instance
- Autoscaling toggle (adds limited headroom)

### Cache
- Enabled / disabled
- Cache hit rate
- Cache throughput capacity

### Database
- Base QPS capacity
- Write penalty
- Replication (read scalability)
- Partitioning (write scalability)

### Baseline Latency
Represents network + serialization + base compute cost.

---

## 📊 What the Simulator Produces

- **System Health**: Healthy / Degraded / Overloaded
- **Latency**: p50 and p95
- **Error Rate** and dominant cause
- **Bottleneck Identification**
- **Monthly Cost Estimate**
- **Hotspot Indicators**

Each component includes an ⓘ info panel explaining:
- What it represents
- What affects it
- What it affects
- Typical failure symptoms
- Common mitigation strategies

---

## 🔍 Key Assumptions

- Single service (no microservice fan-out)
- Uniform request cost
- Cache affects reads only
- Linear scaling per tier (approximation)
- No explicit queues (queueing is modeled via latency curves)
- Costs are simplified and configurable (not cloud-exact)

These assumptions are intentional to keep reasoning clear and educational.

---

## 💰 Cost Model (Simplified)

| Component | Cost Assumption |
|---------|-----------------|
| App | $32 / instance / month |
| Cache | $55 base + $18 per 1000 RPS capacity |
| DB | $140 base + $35 per 100 QPS |
| Replication | +$55 |
| Partitioning | +$35 |

Costs exist to reinforce **real-world trade-offs**, not billing accuracy.

---

## 🧪 Example Scenarios

### Read-Heavy Workload
- High cache hit rate dramatically reduces DB load
- Cache may become the next bottleneck if undersized

### Write-Heavy Workload
- Cache provides limited benefit
- Partitioning improves scalability more than replication

### Traffic Spike
- Autoscaling helps slightly
- p95 rises quickly
- Errors appear without rate limiting or buffering

### Scaling the Wrong Tier
- Scaling app servers does not fix a DB bottleneck
- Bottleneck-first scaling is mandatory

---

## 🎯 Who This Is For

- Engineers preparing for system design interviews
- Senior engineers teaching architecture trade-offs
- Internal demos explaining scalability decisions


---

## 🚀 Future Enhancements
- Failure injection (DB down, cache cold start)
- Time-series traffic simulation
- Queues and backpressure
- Multi-service architectures
- Auto-generated architecture recommendations

---

## 🧩 Philosophy

System design is not about choosing the “correct architecture”.
It’s about understanding **constraints, bottlenecks, and trade-offs**.

This simulator makes those dynamics visible.
