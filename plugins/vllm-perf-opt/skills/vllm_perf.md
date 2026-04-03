# vLLM Performance Optimization Skill

This skill helps analyze and optimize vLLM inference performance based on real-world optimization patterns from vLLM core contributors.

## When This Skill Activates

This skill activates when users want to:
- Optimize vLLM serving performance
- Analyze LLM inference bottlenecks
- Improve throughput and latency
- Profile vLLM workloads
- Optimize Triton kernels
- Optimize CUDA kernels
- Work with MoE (Mixture of Experts) layers
- Analyze pooling/embedding models
- Work with KV cache and disaggregation

DO NOT activate when: the request is unrelated to vLLM or LLM performance optimization.

---

## Performance Optimization Methods

### 1. Tensor Operation Optimization

Replace Python loops with vectorized tensor operations.

**Pattern: Use split/chunks instead of list slicing**
```python
# Before: List comprehension with slicing
hidden_states_lst = [
    hidden_states[first : last + 1]
    for first, last in zip(first_indices, last_indices)
]

# After: Use tensor split (faster)
split_sizes = num_tokens_per_seq.tolist()
hidden_states_lst = list(hidden_states.split(split_sizes, dim=0))
```

**Pattern: Use index_add for scatter operations**
```python
# Instead of cumsum + large temp tensor, use index_add
```

### 2. Caching Optimization

Cache repeated computations, especially small ID lookups.

**Pattern: Small ID cache for cumsum**
```python
# Cache small token IDs to avoid redundant cumsum calculations
# Especially effective when the same IDs appear frequently
```

### 3. Reduce Device Copies

Minimize CPU-GPU data transfers.

**Pattern: Eliminate redundant device transfers**
```python
# Before: CPU -> GPU -> CPU (twice)
token_ids_cpu = token_ids.to(cpu)
token_ids_gpu = token_ids_cpu.to(gpu)
# ... operations ...
result_cpu = result.to(cpu)

# After: Keep data on device when possible
# Process entirely on GPU, only transfer when necessary
```

### 4. Batching Optimization

Use batched operations instead of per-item processing.

**Pattern: Batched computation**
```python
# Before: Process each item individually
for i in range(batch_size):
    result[i] = compute_maxsim(query[i], doc_embeds[i])

# After: Batch the computation
result = batched_maxsim(query_batch, doc_embeds_batch)
```

### 5. Kernel Tuning - Triton

Optimize Triton kernel configurations for specific hardware.

**Pattern: Tuned Triton config for MoE layers**
```python
# Example: Qwen3.5 H200 tuned config
# Tune block_size, num_warps, num_stages for specific batch sizes
MOE_CONFIGS = {
    "Qwen3.5-35B-A3B": {
        "bs128": {...tuned_params...}
    }
}
```

**Triton Kernel Tuning Parameters:**
- `BLOCK_SIZE_M`, `BLOCK_SIZE_N`, `BLOCK_SIZE_K`
- `GROUP_SIZE_M`
- `num_warps`: [4, 8, 16, 32]
- `num_stages`: [1, 2, 3, 4]

### 6. Kernel Tuning - CUDA

Optimize CUDA kernels with vectorization.

**Pattern: Vectorization for reshape_and_cache_flash**
```python
# Use vectorized load/store for better memory bandwidth
# Before: scalar operations
# After: float4, float2 vectorization
```

### 7. DeepGEMM Integration

Leverage DeepSeek's DeepGEMM for efficient MoE computation.

**Pattern: DeepGEMM FP8 MoE**
```python
# Use DeepGEMM for FP8 weighted MoE layers
# Benefits: Better performance for EP (Expert Parallelism)
# Enable: VLLM_USE_DEEP_GEMM=1
export VLLM_ALL2ALL_BACKEND="deepep_low_latency"
```

### 8. Conditional Skipping

Skip unnecessary work when possible.

**Pattern: Skip empty KV connector work**
```python
# Skip processing when there's no actual work
if num_tokens == 0:
    return
```

### 9. Scheduler Optimization

Reduce scheduler overhead.

**Pattern: Async scheduling optimization**
```python
# Sync case: no copy needed
# Async case: only copy output_token_ids
# Avoid: req.all_token_ids.copy() when not necessary
```

### 10. Model Runner v2 Optimization

Optimize the new Model Runner architecture.

**Patterns:**
- Reduce prepare_inputs copy logic
- Optimize sampler redundant copy
- Sequence Parallel support
- EPLB (Expert Parallelism Load Balancing)

---

## Performance Testing Methods

### 1. vLLM Serving Benchmark

```bash
# Basic serving benchmark
vllm serve <model> \
  --host 127.0.0.1 --port 9256 \
  --dtype bfloat16

# Run benchmark with random data
vllm bench serve \
  --model <model> \
  --dataset-name random \
  --random-input-len 128 \
  --random-output-len 512 \
  --request-rate inf \
  --num-prompts 128 \
  --num-warmups 16

# High concurrency benchmark
vllm bench serve \
  --model <model> \
  --dataset-name random \
  --random-input-len 2 \
  --random-output-len 2048 \
  --num-prompts 128 \
  --num-warmups 16 \
  --max-concurrency 128

# Reranking benchmark
vllm bench serve \
  --model jinaai/jina-colbert-v2 \
  --backend vllm-rerank \
  --endpoint /v1/rerank \
  --dataset-name random-rerank \
  --num-prompts 2000 \
  --max-concurrency 64
```

### 2. Kernel Benchmark

```bash
# MoE kernel benchmark
python benchmark_moe.py --use-deep-gemm --dtype fp8_w8a8

# Reshape and cache benchmark
python benchmark_reshape_and_cache_flash.py
```

### 3. Embedding/Pooling Benchmark

```bash
# Start pooling server
python -m vllm.entrypoints.cli.main serve <model> \
  --runner pooling \
  --max-model-len 4000

# Custom benchmark with aiohttp
python - <<'PY'
import asyncio
import aiohttp

URL = "http://127.0.0.1:8000/pooling"
MODEL = "BAAI/bge-m3"
CONCURRENCY = 64
TOTAL = 2000

async def run():
    connector = aiohttp.TCPConnector(limit=0)
    async with aiohttp.ClientSession(connector=connector) as session:
        sem = asyncio.Semaphore(CONCURRENCY)
        async def req(i):
            async with sem:
                return await session.post(URL, json={
                    "model": MODEL,
                    "task": "embed",
                    "input": ["text"]
                })
        tasks = [req(i) for i in range(TOTAL)]
        await asyncio.gather(*tasks)

asyncio.run(run())
PY
```

### 4. Accuracy Testing with lm_eval

```bash
# Verify model quality after optimization
lm_eval --model local-completions \
  --model_args "base_url=http://127.0.0.1:9256/v1/completions,model=<model>,num_concurrent=1024" \
  --tasks gsm8k
```

### 5. Unit Tests

```bash
# Pooling model tests
pytest tests/models/language/pooling/test_multi_vector_retrieval.py
pytest tests/models/language/pooling/test_all_pooling_plus_chunked_prefill.py

# Scheduler tests
pytest tests/v1/core/test_scheduler.py

# Cache tests
pytest test_cache.py -x

# MoE tests
pytest tests/ -k moe
```

---

## Key Metrics

| Metric | Description | Target |
|--------|-------------|--------|
| TTFT | Time to First Token | Lower is better |
| TPOT | Time per Output Token | Lower is better |
| E2E Latency | End-to-end request latency | Lower is better |
| req/s | Requests per second | Higher is better |
| tok/s | Tokens per second (throughput) | Higher is better |
| p50/p95/p99 | Percentile latencies | Lower is better |
| Kernel Time | Individual kernel execution time | Lower is better |

---

## Code Patterns by Use Case

### Pooling Models (Embeddings)

```python
# Mean pooling optimization
def mean_pool(hidden_states, positions):
    # Use split + index_add instead of cumsum
    split_sizes = num_tokens_per_seq
    chunks = hidden_states.split(split_sizes, dim=0)
    # ... efficient computation
```

### MoE (Mixture of Experts)

```python
# Triton kernel tuning
# Test different configurations for your hardware
TRITON_MOE_CONFIGS = {
    "block_size": [64, 128, 256],
    "num_warps": [4, 8, 16],
    "num_stages": [1, 2, 3]
}

# DeepGEMM for FP8
# Use DeepSeek's DeepGEMM for better EP performance
```

### KV Connector / Disaggregation

```python
# Skip empty work
def process_kv(connector, work_items):
    if not work_items or len(work_items) == 0:
        return
    # ... process only when there's work
```

### CUDA Kernels

```python
# Vectorization pattern
# Use float4/float2 for vectorized memory access
# Improves memory bandwidth utilization
```

---

## Optimization Checklist

When analyzing vLLM performance:

- [ ] Check for Python loops that can be vectorized
- [ ] Look for redundant CPU-GPU transfers
- [ ] Identify cached computations that can be reused
- [ ] Verify batching opportunities
- [ ] Test Triton kernel configurations for your hardware
- [ ] Test DeepGEMM vs Triton for MoE
- [ ] Add conditional early returns for empty work
- [ ] Profile with `vllm bench serve` before/after
- [ ] Verify accuracy with `lm_eval`
- [ ] Check scheduler overhead
- [ ] Analyze model runner v2 vs v1

---

## Real-World Optimization Examples

### High-Impact Optimizations (>10%)

| Optimization | Technique | Improvement |
|--------------|-----------|-------------|
| MoE align block size | CUDA kernel rewrite | 8-10x for large experts |
| DeepGEMM | FP8 MoE integration | 5.5% throughput |
| Batch invariant BMM | Batched matmul | 18.1% throughput |
| Model runner v2 prepare_inputs | Copy optimization | 6.1% E2E |
| Triton MoE H200 | Tuned config | 9.9% E2E |

### Medium-Impact Optimizations (1-10%)

| Optimization | Technique | Improvement |
|--------------|-----------|-------------|
| Mean pooling | chunks + index_add | 5.9% E2E |
| Cutlass MoE | Problem size calc | 5.3% E2E |
| Reshape cache | CUDA vectorization | ~20% kernel |
| MaxSim scores | CUDA optimization | 13.9% E2E |
| Token IDs copy | Remove redundant CPU-GPU-CPU | 48.9% E2E |
| Scheduler overhead | Async optimization | 0.9% E2E |
| Sampler copy | Remove redundant copy | 1.8% throughput |

### Low-Impact Optimizations (<1%)

| Optimization | Technique | Improvement |
|--------------|-----------|-------------|
| Cumsum | Add small ID cache | 2.8% throughput |
| Token embed | split + reuse cumsum | 1.0% throughput |
| MaxSim | Batched computation | 3.2% E2E |
| MaxSim | Worker-side compute | 2.7% E2E |
| KV connector | Skip empty work | ~1% throughput |

---

## Hardware-Specific Tuning

### NVIDIA H200

```bash
# Triton MoE tuning
# Best for bs=128 (hot path)
# Key params: BLOCK_SIZE_M=64, BLOCK_SIZE_N=64, num_warps=8
```

### NVIDIA B200

```bash
# DeepGEMM recommended for FP8
# Expert parallelism: 224-512 experts
# Significant speedup vs Triton
```

### AMD (ROCm)

```bash
# Use VLLM_ALL2ALL_BACKEND for EP
# Check compatibility matrix
```

---

## Profiling Tools

```bash
# PyTorch profiler
--profiler-config.profiler=torch
--profiler-config.torch_profiler_dir=/path/to/profile

# NSight Systems
nsys profile -t cuda,nvtx ...

# vLLM metrics
curl http://localhost:8000/metrics
```

---

## Common Bottleneck Patterns

1. **Memory-bound**: KV cache access, embedding lookup
2. **Compute-bound**: MoE layers, attention
3. **Communication-bound**: EP all-reduce, TP all-gather
4. **Scheduler overhead**: Request batching, token allocation
5. **Data transfer**: CPU-GPU copies, cross-node KV transfer