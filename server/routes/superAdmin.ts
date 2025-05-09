import { Router } from 'express';
import {
  getAllHospitals, getHospitalById, createHospital, updateHospital, deleteHospital,
  getAllUsers, getUserById, updateUser, deleteUser, getAllRoles
} from '../controllers/superAdmin';
import { isSuperAdmin } from '../middleware/auth';

const router = Router();

// 슈퍼관리자 권한 확인 미들웨어 적용
router.use(isSuperAdmin);

// 병원 관련 라우트
router.get('/hospitals', getAllHospitals);
router.get('/hospitals/:id', getHospitalById);
router.post('/hospitals', createHospital);
router.put('/hospitals/:id', updateHospital);
router.delete('/hospitals/:id', deleteHospital);

// 회원 관련 라우트
router.get('/users', getAllUsers);
router.get('/users/:id', getUserById);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);
router.get('/roles', getAllRoles);

export default router;