# Triton Kernel Analyzer Skill

This skill helps you analyze and optimize Triton GPU kernel performance using built-in profilers and NVIDIA profiling tools.

## When This Skill Activates

This skill activates when users want to analyze, profile, or optimize Triton kernels. Examples include:
- Profiling Triton kernel performance
- Analyzing kernel latency and throughput
- Identifying bottlenecks in GPU kernels
- Optimizing memory access patterns
- Analyzing kernel launch overhead
- Using Triton profiler or NVIDIA profiling tools

DO NOT activate when: the request is unrelated to Triton kernel analysis.

## Profiling Methods Overview

### 1. Triton Built-in Profiler
The simplest way to profile Triton kernels using Triton's native profiler.

```python
import triton
import triton.language as tl

@triton.jit
def kernel_example(X, Y, Z, N, BLOCK_SIZE: tl.constexpr):
    # Kernel code
    pass

# Enable profiling
with triton.profiler.active():
    kernel_example[(grid,)](x, y, z, N, BLOCK_SIZE=1024)

# Or use the profiler装饰器
@triton.jit
@triton.profiler.annotate()
def profiled_kernel(X, Y, N, BLOCK_SIZE: tl.constexpr):
    pass
```

### 2. Triton Perf Tutorial Pattern
```python
# Run kernel with auto-tuned config and measure performance
from triton.runtime import driver

# Example from Triton's perf guide
@triton.jit
def matmul_kernel(A, B, C, M, N, K, stride_am, stride_ak,
                  stride_bk, stride_bn, stride_cm, stride_cn,
                  BLOCK_M: tl.constexpr, BLOCK_N: tl.constexpr, BLOCK_K: tl.constexpr):
    pass
```

## Key Metrics to Analyze

### Kernel Execution Metrics
- **Grid/Block Configuration**: Number of warps, blocks
- **Theoretical Occupancy vs Actual**: Check if kernels are underutilizing GPU
- **Launch Overhead**: Time spent in kernel launch vs execution

### Memory Metrics
- **Global Memory Access**: Bytes loaded/stored per kernel
- **Bandwidth Utilization**: Actual vs peak bandwidth
- **Cache Hit Rates**: L2 cache, texture cache
- **Memory Coalescing**: Whether accesses are coalesced
- **Bank Conflicts**: Shared memory bank conflicts

### Compute Metrics
- **Arithmetic Intensity**: FLOPs per byte of memory access
- **Theoretical vs Achieved GFLOPs**: Efficiency indicator
- **IPC (Instructions Per Cycle)**: How well the warp utilizes execution units

## Common Performance Patterns

### 1. Analyzing Launch Configuration
```python
# Check what grid/block configuration was used
print(f"Grid: {grid}")
print(f"BLOCK_SIZE: {BLOCK_SIZE}")
print(f"Number of warps: {BLOCK_SIZE // 32}")

# Analyze if grid is large enough to saturate GPU
# Rule of thumb: need at least #SMs * 4 blocks for good occupancy
```

### 2. Memory Access Analysis
```python
# Check memory access pattern in kernel
# Look for:
# - Sequential vs strided access
# - Whether pointers are aligned
# - Use of prefetching

@triton.jit
def optimized_kernel(X, Y, N, BLOCK_SIZE: tl.constexpr):
    # Good: sequential, aligned access
    pid = tl.program_id(0)
    offs = pid * BLOCK_SIZE + tl.arange(0, BLOCK_SIZE)
    x = tl.load(X + offs)  # Sequential
```

### 3. Loop Tiling for Better Cache Utilization
```python
# Before: strided access causing poor cache behavior
for i in range(0, N, BLOCK_SIZE):
    x = tl.load(X + i + tl.arange(0, BLOCK_SIZE))  # Strided

# After: loop tiling for better locality
for i in range(0, N, BLOCK_SIZE * 4):
    for j in range(0, BLOCK_SIZE * 4, BLOCK_SIZE):
        x = tl.load(X + i + j + tl.arange(0, BLOCK_SIZE))  # More coalesced
```

### 4. Reducing Bank Conflicts in Shared Memory
```python
# Use padding to avoid bank conflicts
# Instead of:
data = tl.load(ptr + offsets)  # potential bank conflicts

# Use:
DATA_PADDED = (BLOCK_SIZE + 1)  # Add padding
offsets = tl.arange(0, BLOCK_SIZE) * DATA_PADDED
```

## NVIDIA Profiling Tools

### 1. Nsight Systems (nsys)
```bash
# Profile Triton kernel execution
nsys profile -o triton_profile \
    -w true \
    -t cuda,nvtx,osrt \
    --cuda-memory-usage=true \
    python your_script.py

# Analyze the profile
nsys stats triton_profile.qdrep --report gputrace,cudaapisum,gpukernsum
```

### 2. Nsight Compute (ncu)
```bash
# Profile kernel-level metrics
ncu --metrics sm__throughput.avg.pct_of_peak_sustained,\
l1tex__t_sectors_pipe_lsu_mem_global_op_ld.sum,\
l1tex__t_sectors_pipe_lsu_mem_global_op_st.sum,\
l2tex__t_sectors_aperture_sysmem_op_read.sum,\
l2tex__t_sectors_aperture_sysmem_op_write.sum \
    python your_script.py
```

### 3. PyTorch Profiler with Triton
```python
import torch
from torch.profiler import profile, ProfilerActivity

with profile(
    activities=[ProfilerActivity.CPU, ProfilerActivity.CUDA],
    record_shapes=True,
    with_stack=True
) as prof:
    # Run your Triton kernel
    output = triton_kernel(input)

print(prof.key_averages().table(sort_by="cuda_time_total", row_limit=20))
```

### 4. Triton Hook for Detailed Timing
```python
import triton

# Add timing hooks
def hook_fn(name):
    def inner(fn):
        def wrapper(*args, **kwargs):
            start = torch.cuda.Event(enable_timing=True)
            end = torch.cuda.Event(enable_timing=True)
            start.record()
            result = fn(*args, **kwargs)
            end.record()
            torch.cuda.synchronize()
            print(f"{name}: {start.elapsed_time(end):.3f}ms")
            return result
        return wrapper
    return inner
```

## Common Bottlenecks and Solutions

### 1. Memory-Bound Kernels
**Symptoms**: Low GPU utilization, low IPC
**Solutions**:
- Increase arithmetic intensity
- Use shared memory for frequently accessed data
- Loop tiling to improve cache locality
- Use `tl.constexpr` for compile-time optimization

### 2. Compute-Bound Kernels
**Symptoms**: High compute throughput
**Solutions**:
- Use mixed-precision (fp16, bf16)
- Reduce unnecessary conversions
- Use tensor cores when available

### 3. Launch Overhead
**Symptoms**: Very short kernel times, high overhead ratio
**Solutions**:
- Fuse multiple operations into single kernel
- Increase work per kernel
- Use persistent kernels

### 4. Uncoalesced Memory Access
**Symptoms**: Low bandwidth utilization despite sequential access pattern
**Solutions**:
- Rearrange data layout
- Use BLOCK_SIZE that's a power of 2
- Ensure alignment

## Optimization Checklist

When analyzing a Triton kernel, check these items:

- [ ] **Grid/Block Size**: Is the grid large enough? Are blocks using enough warps?
- [ ] **Memory Access**: Are accesses coalesced? Any strided patterns?
- [ ] **Shared Memory**: Can frequently accessed data be cached in shared memory?
- [ ] **Bank Conflicts**: Are there any shared memory bank conflicts?
- [ ] **Registers**: Are too many registers being used (limits occupancy)?
- [ ] **Data Types**: Can you use smaller data types (fp16 instead of fp32)?
- [ ] **Loop Unrolling**: Use `tl.constexpr` for compile-time unrolling
- [ ] **Autotuning**: Have you used `@triton.autotune` for optimal configs?

## Code Analysis Patterns

### Finding Launch Configuration Issues
```python
# Look for hardcoded values that should be autotuned
# Bad:
BLOCK_SIZE = 128

# Good:
@triton.autotune(
    configs=[
        triton.Config({'BLOCK_SIZE': 128}, num_stages=3, num_warps=8),
        triton.Config({'BLOCK_SIZE': 256}, num_stages=4, num_warps=16),
    ],
    key=['N']
)
@triton.jit
def optimal_kernel(X, Y, N, BLOCK_SIZE: tl.constexpr):
    pass
```

### Analyzing Memory Access Patterns
```python
# Identify strided access (bad for performance)
for i in range(0, N, BLOCK_SIZE):
    row = i // N  # Strided!
    col = i % N
    x = tl.load(X + row * stride + col)

# Identify sequential access (good)
for i in range(0, N, BLOCK_SIZE):
    x = tl.load(X + i + tl.arange(0, BLOCK_SIZE))  # Sequential
```

## Usage Examples

1. **Enable Triton profiler**:
   ```python
   with triton.profiler.active():
       kernel_function[(grid,)](args)
   ```

2. **Profile with PyTorch profiler**:
   ```python
   with profile(activities=[ProfilerActivity.CUDA]) as prof:
       result = triton_kernel(input)
   print(prof.key_averages().table())
   ```

3. **Analyze kernel with nsys**:
   ```bash
   nsys profile -o profile python script.py
   nsys stats profile.qdrep --report gputrace
   ```

4. **Find memory bottlenecks**:
   - Check `l2tex__t_sectors_aperture_sysmem_op_*` metrics
   - Compare against theoretical bandwidth

5. **Check occupancy**:
   - Use `ncu --metrics sm__warps_active.avg.pct_of_peak_sustained`
   - Target: >90% for memory-bound, >80% for compute-bound

6. **Identify bank conflicts**:
   - Use `ncu --metrics l1tex__data_bank_conflicts_pipe_lsu_mem_global_op_ld.sum`

7. **Measure arithmetic intensity**:
   - Calculate: FLOPs / (bytes accessed)
   - Compare against roofline model
