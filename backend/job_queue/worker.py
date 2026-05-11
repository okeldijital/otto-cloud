#!/usr/bin/env python3
"""
RQ worker for Otto jobs.
Run with:
  - Single worker: python -m job_queue.worker
  - Multiple workers: python -m job_queue.worker --num-workers 3
"""
import argparse
from rq import Worker
from job_queue.connection import get_redis_connection, default_queue
import structlog

logger = structlog.get_logger()


def main(num_workers: int = 1):
    redis_conn = get_redis_connection()

    if num_workers == 1:
        worker = Worker([default_queue], connection=redis_conn)
        logger.info("worker_started", queue=default_queue.name, workers=1)
        worker.work()
    else:
        import multiprocessing

        def start_worker():
            worker = Worker([default_queue], connection=redis_conn)
            worker.work()

        logger.info("starting_workers", count=num_workers, queue=default_queue.name)
        processes = [multiprocessing.Process(target=start_worker) for _ in range(num_workers)]

        for p in processes:
            p.start()

        for p in processes:
            p.join()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--num-workers", type=int, default=1)
    args = parser.parse_args()

    main(args.num_workers)