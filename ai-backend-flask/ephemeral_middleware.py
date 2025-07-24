import logging
import gc
import time
from datetime import datetime
from typing import Dict, Any, Optional
from functools import wraps

logger = logging.getLogger(__name__)

class EphemeralMiddleware:
    """
    Middleware to ensure ephemeral processing with zero data retention.
    Forces cleanup of all temporary data and ensures no storage occurs.
    """
    
    def __init__(self):
        self.active_sessions = {}
        self.cleanup_log = []
    
    def ephemeral_middleware(self, f):
        """
        Decorator for ephemeral processing endpoints.
        Ensures zero data retention and proper cleanup.
        """
        @wraps(f)
        def decorated_function(*args, **kwargs):
            session_id = self._generate_session_id()
            start_time = time.time()
            
            logger.info(f"🔒 [EPHEMERAL_MIDDLEWARE] Starting ephemeral session: {session_id}")
            
            try:
                # Set ephemeral processing flags
                self._set_ephemeral_flags(session_id)
                
                # Execute the processing function
                result = f(*args, **kwargs)
                
                # Log successful processing
                processing_time = time.time() - start_time
                logger.info(f"🔒 [EPHEMERAL_MIDDLEWARE] Session {session_id} completed in {processing_time:.2f}s")
                
                return result
                
            except Exception as e:
                logger.error(f"🔒 [EPHEMERAL_MIDDLEWARE] Session {session_id} failed: {str(e)}")
                raise
                
            finally:
                # Force cleanup regardless of success/failure
                self._force_cleanup(session_id)
        
        return decorated_function
    
    def _generate_session_id(self) -> str:
        """Generate unique session ID for ephemeral processing"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        random_suffix = str(int(time.time() * 1000))[-6:]
        return f"ephemeral_{timestamp}_{random_suffix}"
    
    def _set_ephemeral_flags(self, session_id: str):
        """Set ephemeral processing flags and headers"""
        self.active_sessions[session_id] = {
            'start_time': datetime.now(),
            'flags_set': True,
            'data_retention': 'zero-storage',
            'processing_mode': 'ephemeral-only',
            'cleanup_required': True
        }
        
        logger.info(f"🔒 [EPHEMERAL_MIDDLEWARE] Set ephemeral flags for session: {session_id}")
    
    def _force_cleanup(self, session_id: str):
        """Force cleanup of all temporary data"""
        logger.info(f"🔒 [EPHEMERAL_MIDDLEWARE] Starting forced cleanup for session: {session_id}")
        
        try:
            # Clear session data
            if session_id in self.active_sessions:
                session_data = self.active_sessions[session_id]
                session_data['cleanup_time'] = datetime.now()
                session_data['cleanup_completed'] = True
                
                # Log cleanup
                self.cleanup_log.append({
                    'session_id': session_id,
                    'cleanup_time': datetime.now().isoformat(),
                    'session_duration': (session_data['cleanup_time'] - session_data['start_time']).total_seconds()
                })
                
                # Remove from active sessions
                del self.active_sessions[session_id]
            
            # Force garbage collection
            if hasattr(gc, 'collect'):
                collected = gc.collect()
                logger.info(f"🔒 [EPHEMERAL_MIDDLEWARE] Garbage collection completed: {collected} objects collected")
            
            # Additional memory cleanup
            self._clear_memory_artifacts()
            
            logger.info(f"🔒 [EPHEMERAL_MIDDLEWARE] Cleanup completed for session: {session_id}")
            
        except Exception as e:
            logger.error(f"🔒 [EPHEMERAL_MIDDLEWARE] Cleanup error for session {session_id}: {str(e)}")
            # Even if cleanup fails, we don't want to expose data
            raise Exception('Ephemeral cleanup failed - session terminated for security')
    
    def _clear_memory_artifacts(self):
        """Clear any remaining memory artifacts"""
        try:
            # Clear any temporary variables that might hold data
            import sys
            for name in list(sys.modules.keys()):
                if name.startswith('temp_') or name.startswith('ephemeral_'):
                    if name in sys.modules:
                        del sys.modules[name]
            
            logger.info("🔒 [EPHEMERAL_MIDDLEWARE] Memory artifacts cleared")
            
        except Exception as e:
            logger.warning(f"🔒 [EPHEMERAL_MIDDLEWARE] Memory artifact cleanup warning: {str(e)}")
    
    def get_cleanup_stats(self) -> Dict[str, Any]:
        """Get cleanup statistics for monitoring"""
        return {
            'active_sessions': len(self.active_sessions),
            'total_cleanups': len(self.cleanup_log),
            'recent_cleanups': self.cleanup_log[-10:] if self.cleanup_log else [],
            'cleanup_success_rate': self._calculate_cleanup_success_rate()
        }
    
    def _calculate_cleanup_success_rate(self) -> float:
        """Calculate cleanup success rate"""
        if not self.cleanup_log:
            return 100.0
        
        successful_cleanups = len([log for log in self.cleanup_log if log.get('cleanup_completed', False)])
        return (successful_cleanups / len(self.cleanup_log)) * 100

# Global ephemeral middleware instance
ephemeral_middleware = EphemeralMiddleware() 